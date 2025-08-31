-- AUTO CLEANUP FOR INCOMPLETE ACCOUNTS (3 DAYS)
-- This script creates a function to automatically delete accounts that haven't completed onboarding within 3 days

-- Function to clean up incomplete accounts
CREATE OR REPLACE FUNCTION public.cleanup_incomplete_accounts()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    user_record RECORD;
    three_days_ago TIMESTAMP := NOW() - INTERVAL '3 days';
BEGIN
    -- Find users who:
    -- 1. Created account more than 3 days ago
    -- 2. Don't have a complete profile in the profiles table
    -- 3. Are not already deleted
    
    FOR user_record IN 
        SELECT au.id, au.email, au.created_at
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.user_id
        WHERE au.created_at < three_days_ago
        AND (
            p.user_id IS NULL  -- No profile exists
            OR p.username IS NULL  -- Profile exists but incomplete (no username)
            OR p.username = ''     -- Empty username
        )
        AND au.deleted_at IS NULL  -- Not already deleted
        AND au.aud = 'authenticated'  -- Valid user
    LOOP
        BEGIN
            -- Log the cleanup action
            INSERT INTO public.cleanup_log (
                user_id, 
                email, 
                cleanup_reason, 
                cleanup_date,
                account_age_days
            ) VALUES (
                user_record.id,
                user_record.email,
                'Incomplete onboarding - auto cleanup after 3 days',
                NOW(),
                EXTRACT(DAY FROM (NOW() - user_record.created_at))
            );
            
            -- Delete user data from profiles if exists
            DELETE FROM public.profiles WHERE user_id = user_record.id;
            
            -- Delete from group_members if exists
            DELETE FROM public.group_members WHERE user_id = user_record.id;
            
            -- Delete any messages if exists
            DELETE FROM public.chat_messages WHERE user_id = user_record.id;
            
            -- Soft delete the auth user (Supabase recommended approach)
            UPDATE auth.users 
            SET deleted_at = NOW(),
                email = user_record.email || '.deleted.' || extract(epoch from now())
            WHERE id = user_record.id;
            
            deleted_count := deleted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log errors but continue with other users
            INSERT INTO public.cleanup_log (
                user_id, 
                email, 
                cleanup_reason, 
                cleanup_date,
                error_message
            ) VALUES (
                user_record.id,
                user_record.email,
                'Cleanup failed',
                NOW(),
                SQLERRM
            );
        END;
    END LOOP;
    
    RETURN 'Cleaned up ' || deleted_count || ' incomplete accounts';
END;
$$;

-- Create cleanup log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cleanup_log (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    email TEXT,
    cleanup_reason TEXT,
    cleanup_date TIMESTAMP DEFAULT NOW(),
    account_age_days NUMERIC,
    error_message TEXT
);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_cleanup_log_date ON public.cleanup_log(cleanup_date);
CREATE INDEX IF NOT EXISTS idx_cleanup_log_user_id ON public.cleanup_log(user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL ON public.cleanup_log TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_incomplete_accounts() TO postgres, service_role;

-- Create a function to schedule daily cleanup (requires pg_cron extension)
-- Note: This would need to be enabled in Supabase dashboard under Database > Extensions

-- Example cron job (run daily at 2 AM):
-- SELECT cron.schedule('cleanup-incomplete-accounts', '0 2 * * *', 'SELECT public.cleanup_incomplete_accounts();');

-- Manual function to check what accounts would be cleaned up (for testing)
CREATE OR REPLACE FUNCTION public.preview_cleanup_incomplete_accounts()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    created_at TIMESTAMP,
    days_old NUMERIC,
    has_profile BOOLEAN,
    username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    three_days_ago TIMESTAMP := NOW() - INTERVAL '3 days';
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        au.created_at,
        EXTRACT(DAY FROM (NOW() - au.created_at)) as days_old,
        (p.user_id IS NOT NULL) as has_profile,
        COALESCE(p.username, 'null') as username
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.user_id
    WHERE au.created_at < three_days_ago
    AND (
        p.user_id IS NULL
        OR p.username IS NULL
        OR p.username = ''
    )
    AND au.deleted_at IS NULL
    AND au.aud = 'authenticated'
    ORDER BY au.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_cleanup_incomplete_accounts() TO postgres, service_role;

-- RLS Policies for cleanup_log table
ALTER TABLE public.cleanup_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to read cleanup logs (admin only)
CREATE POLICY "Service role can read cleanup logs" ON public.cleanup_log
    FOR SELECT USING (auth.role() = 'service_role');

-- Create a function that users can call to extend their account by completing onboarding
CREATE OR REPLACE FUNCTION public.extend_account_by_completing_onboarding(
    p_user_id UUID,
    p_username TEXT,
    p_genres TEXT[],
    p_personality TEXT[],
    p_habits TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user exists and is not deleted
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = p_user_id 
        AND deleted_at IS NULL
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found or already deleted'
        );
    END IF;
    
    -- Update or insert profile to mark onboarding as complete
    INSERT INTO public.profiles (
        user_id, username, genres, personality, habits, updated_at
    ) VALUES (
        p_user_id, p_username, p_genres, p_personality, p_habits, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        genres = EXCLUDED.genres,
        personality = EXCLUDED.personality,
        habits = EXCLUDED.habits,
        updated_at = NOW();
    
    -- Log that account was extended by completing onboarding
    INSERT INTO public.cleanup_log (
        user_id,
        cleanup_reason,
        cleanup_date
    ) VALUES (
        p_user_id,
        'Account extended - onboarding completed',
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Account extended by completing onboarding'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.extend_account_by_completing_onboarding(UUID, TEXT, TEXT[], TEXT[], TEXT[]) TO authenticated;

-- Comments for usage:
-- 
-- TO USE THIS CLEANUP SYSTEM:
-- 
-- 1. Run this SQL in Supabase SQL Editor to create the functions and table
-- 
-- 2. To preview what accounts would be cleaned up:
--    SELECT * FROM public.preview_cleanup_incomplete_accounts();
-- 
-- 3. To manually run cleanup:
--    SELECT public.cleanup_incomplete_accounts();
-- 
-- 4. To set up automatic daily cleanup (requires pg_cron extension):
--    - Enable pg_cron in Supabase Dashboard > Database > Extensions
--    - Run: SELECT cron.schedule('cleanup-incomplete-accounts', '0 2 * * *', 'SELECT public.cleanup_incomplete_accounts();');
-- 
-- 5. To see cleanup history:
--    SELECT * FROM public.cleanup_log ORDER BY cleanup_date DESC;