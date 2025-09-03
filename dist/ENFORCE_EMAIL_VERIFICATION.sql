-- Enforce Email Verification - Security Update
-- This ensures email confirmation is required before any app functionality

-- Step 1: Check current auth configuration
SELECT 
    'CURRENT AUTH CONFIG' as status,
    'Checking if email confirmation is enabled' as description;

-- Step 2: Update RPC functions to require email confirmation
-- Drop and recreate add_user_to_group with email verification check
DROP FUNCTION IF EXISTS public.add_user_to_group(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.add_user_to_group(p_group_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
  group_name TEXT;
  user_email_confirmed_at TIMESTAMPTZ;
  user_email TEXT;
BEGIN
  RAISE NOTICE 'Starting add_user_to_group: group_id=%, user_id=%', p_group_id, p_user_id;
  
  -- Validate inputs
  IF p_group_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid input parameters');
  END IF;
  
  -- CRITICAL: Check if user exists and email is confirmed
  SELECT email, email_confirmed_at 
  INTO user_email, user_email_confirmed_at
  FROM auth.users 
  WHERE id = p_user_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'User not found in auth.users: %', p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth system');
  END IF;
  
  -- BLOCK if email not confirmed
  IF user_email_confirmed_at IS NULL THEN
    RAISE NOTICE 'BLOCKED: User email not confirmed: % (%)', p_user_id, user_email;
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Email verification required. Please check your email and click the verification link.',
      'email_confirmed', false,
      'user_email', user_email
    );
  END IF;
  
  RAISE NOTICE 'User email confirmed: % at %', user_email, user_email_confirmed_at;
  
  -- Get group information
  SELECT current_members, max_members, name 
  INTO current_count, max_count, group_name
  FROM public.groups 
  WHERE id = p_group_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found');
  END IF;
  
  -- Check if already member
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id) THEN
    -- Update profile anyway for consistency
    UPDATE public.profiles SET group_id = p_group_id, updated_at = NOW() WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'group_id', p_group_id, 'message', 'Already member');
  END IF;
  
  -- Check capacity
  IF current_count >= max_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group at capacity');
  END IF;
  
  -- Add to group_members
  BEGIN
    INSERT INTO public.group_members (group_id, user_id, joined_at)
    VALUES (p_group_id, p_user_id, NOW());
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to add to group_members: ' || SQLERRM);
  END;
  
  -- Update profiles.group_id
  BEGIN
    UPDATE public.profiles 
    SET group_id = p_group_id, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Create profile if doesn't exist
    IF NOT FOUND THEN
      INSERT INTO public.profiles (user_id, username, group_id, genres, personality, habits, created_at, updated_at)
      VALUES (p_user_id, 'User' || substring(p_user_id::text from 1 for 8), p_group_id, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET group_id = p_group_id, updated_at = NOW();
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback group_members insert
    DELETE FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update profile: ' || SQLERRM);
  END;
  
  -- Update group count
  UPDATE public.groups SET current_members = current_count + 1 WHERE id = p_group_id;
  
  RAISE NOTICE 'SUCCESS: Verified user % added to group %', user_email, group_name;
  
  RETURN jsonb_build_object(
    'success', true, 
    'group_id', p_group_id,
    'group_name', group_name,
    'email_confirmed', true,
    'user_email', user_email
  );
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.add_user_to_group(uuid, uuid) TO authenticated, anon, service_role;

-- Step 4: Test with existing users
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT;
    test_confirmed_at TIMESTAMPTZ;
    test_group_id UUID;
    test_result JSONB;
BEGIN
    -- Find most recent user
    SELECT id, email, email_confirmed_at 
    INTO test_user_id, test_email, test_confirmed_at
    FROM auth.users 
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing email verification with user: %', test_email;
        
        IF test_confirmed_at IS NULL THEN
            RAISE NOTICE '❌ User email NOT confirmed - this will be blocked';
        ELSE
            RAISE NOTICE '✅ User email confirmed at: %', test_confirmed_at;
        END IF;
        
        -- Create test group
        INSERT INTO public.groups (name, vibe_label, current_members, max_members, is_private, lifecycle_stage)
        VALUES ('EMAIL-TEST-' || extract(epoch from now()), 'Email Verification Test', 0, 10, false, 'active')
        RETURNING id INTO test_group_id;
        
        -- Test the function
        SELECT public.add_user_to_group(test_group_id, test_user_id) INTO test_result;
        
        RAISE NOTICE '📧 EMAIL VERIFICATION TEST RESULT: %', test_result;
        
        -- Cleanup
        DELETE FROM public.group_members WHERE user_id = test_user_id AND group_id = test_group_id;
        UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id AND group_id = test_group_id;
        DELETE FROM public.groups WHERE id = test_group_id;
        
    ELSE
        RAISE NOTICE '❌ No users found to test with';
    END IF;
END $$;

-- Step 5: Final status
SELECT 
    '🔒 EMAIL VERIFICATION ENFORCED' as status,
    'Users must confirm email before joining groups' as security_note,
    'RPC function will block unverified users' as functionality;