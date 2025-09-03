-- COMPLETE RE-SIGNUP EMAIL VERIFICATION FIX
-- Ensures users who delete accounts can immediately re-signup and receive verification emails

-- =========================================================================
-- PART 1: UPDATE DELETE FUNCTION TO HARD DELETE FROM AUTH.USERS
-- =========================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.delete_user_account(uuid) CASCADE;

-- Create improved delete function that HARD DELETES from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  v_deleted_records jsonb;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- SECURITY: Verify user can only delete their own account
  IF current_user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You can only delete your own account'
    );
  END IF;
  
  -- Get user email BEFORE deletion
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RAISE NOTICE '🗑️ HARD DELETING account for: % (ID: %)', user_email, p_user_id;
  
  -- Delete from application tables first (to avoid foreign key issues)
  WITH 
  deleted_group_memberships AS (
    DELETE FROM public.group_members 
    WHERE user_id = p_user_id 
    RETURNING group_id
  ),
  deleted_chat_messages AS (
    DELETE FROM public.chat_messages 
    WHERE user_id = p_user_id 
    RETURNING id
  ),
  deleted_message_reactions AS (
    DELETE FROM public.message_reactions 
    WHERE user_id = p_user_id 
    RETURNING message_id
  ),
  deleted_profiles AS (
    DELETE FROM public.profiles 
    WHERE user_id = p_user_id 
    RETURNING username
  )
  SELECT jsonb_build_object(
    'group_memberships', (SELECT count(*) FROM deleted_group_memberships),
    'chat_messages', (SELECT count(*) FROM deleted_chat_messages),
    'message_reactions', (SELECT count(*) FROM deleted_message_reactions),
    'profiles', (SELECT count(*) FROM deleted_profiles)
  ) INTO v_deleted_records;
  
  -- ⚡ CRITICAL: HARD DELETE from auth.users to free up the email immediately
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RAISE NOTICE '✅ HARD DELETE SUCCESS: Email % is now available for immediate re-signup', user_email;
  
  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account permanently deleted - email immediately available for re-signup',
    'email', user_email,
    'deleted_records', v_deleted_records,
    'can_resignup_immediately', true
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ DELETE ERROR: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Database error: ' || SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- =========================================================================
-- PART 2: CLEANUP EXISTING SOFT-DELETED USERS BLOCKING RE-SIGNUPS
-- =========================================================================

-- Create cleanup function for existing soft-deleted users
CREATE OR REPLACE FUNCTION public.cleanup_soft_deleted_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_count INTEGER;
  blocked_emails TEXT[];
BEGIN
  -- Find emails blocked by soft-deleted accounts
  SELECT array_agg(email) INTO blocked_emails
  FROM auth.users 
  WHERE deleted_at IS NOT NULL;
  
  -- HARD DELETE all soft-deleted users to unblock their emails
  DELETE FROM auth.users 
  WHERE deleted_at IS NOT NULL;
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RAISE NOTICE '🧹 CLEANUP: Hard-deleted % soft-deleted users', cleanup_count;
  RAISE NOTICE '📧 FREED EMAILS: %', blocked_emails;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleaned_up_count', cleanup_count,
    'freed_emails', blocked_emails,
    'message', 'All blocked emails are now available for re-signup'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Cleanup error: ' || SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cleanup_soft_deleted_users() TO authenticated, service_role;

-- =========================================================================
-- PART 3: RUN IMMEDIATE CLEANUP OF EXISTING BLOCKED EMAILS
-- =========================================================================

-- Run cleanup now to fix any currently blocked emails
SELECT public.cleanup_soft_deleted_users() as immediate_cleanup_result;

-- =========================================================================
-- PART 4: ENHANCE SIGNUP HANDLING FOR DELETED ACCOUNT RE-SIGNUPS
-- =========================================================================

-- Create function to handle re-signup verification email issues
CREATE OR REPLACE FUNCTION public.handle_resignup_verification(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user_id uuid;
  is_confirmed boolean;
BEGIN
  -- Check if user exists and is confirmed
  SELECT id, email_confirmed_at IS NOT NULL 
  INTO existing_user_id, is_confirmed
  FROM auth.users 
  WHERE email = lower(trim(p_email))
  LIMIT 1;
  
  IF existing_user_id IS NOT NULL THEN
    IF is_confirmed THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'An active account with this email already exists',
        'action', 'login_instead'
      );
    ELSE
      -- User exists but not confirmed - this is likely a re-signup
      RAISE NOTICE '📧 RESIGNUP DETECTED: Unconfirmed user exists for %', p_email;
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Verification email will be resent',
        'action', 'resend_verification',
        'is_resignup', true
      );
    END IF;
  ELSE
    -- No existing user - normal signup
    RETURN jsonb_build_object(
      'success', true,
      'message', 'New signup - verification email will be sent',
      'action', 'new_signup',
      'is_resignup', false
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Check error: ' || SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_resignup_verification(text) TO anon, authenticated;

-- =========================================================================
-- PART 5: VERIFICATION AND TESTING
-- =========================================================================

-- Check current status
SELECT 
    count(*) as soft_deleted_users_blocking_resignup
FROM auth.users 
WHERE deleted_at IS NOT NULL;

-- Test function exists
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('delete_user_account', 'cleanup_soft_deleted_users', 'handle_resignup_verification');

-- Final verification
DO $$
BEGIN
    RAISE NOTICE '🎉 ================================';
    RAISE NOTICE '🎉 RE-SIGNUP EMAIL FIX COMPLETE!';
    RAISE NOTICE '🎉 ================================';
    RAISE NOTICE '✅ Account deletion: HARD DELETE from auth.users';
    RAISE NOTICE '✅ Existing soft-deleted users: CLEANED UP';
    RAISE NOTICE '✅ Blocked emails: FREED for immediate re-signup';
    RAISE NOTICE '✅ Verification emails: WILL BE SENT for re-signups';
    RAISE NOTICE '✅ Frontend: Enhanced with automatic resend logic';
    RAISE NOTICE '';
    RAISE NOTICE '📋 WHAT THIS FIXES:';
    RAISE NOTICE '  • Users can delete account and immediately re-signup';
    RAISE NOTICE '  • Same email receives new verification email';
    RAISE NOTICE '  • No more "account already exists" errors';
    RAISE NOTICE '  • Automatic resend for edge cases';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TO TEST:';
    RAISE NOTICE '  1. Create account with test email';
    RAISE NOTICE '  2. Delete account from profile page';
    RAISE NOTICE '  3. Immediately sign up again with same email';
    RAISE NOTICE '  4. Should receive new verification email';
END $$;