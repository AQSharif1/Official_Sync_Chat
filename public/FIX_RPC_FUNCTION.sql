-- CRITICAL FIX: Recreate delete_user_account RPC function with correct signature
-- Run this in Supabase SQL Editor to fix both the function signature and user deletion

-- =====================================================
-- 1. DROP EXISTING FUNCTION (if exists)
-- =====================================================

DROP FUNCTION IF EXISTS public.delete_user_account(uuid);
DROP FUNCTION IF EXISTS public.delete_user_account(user_id_to_delete uuid);

-- =====================================================
-- 2. CREATE CORRECTED RPC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  group_ids uuid[];
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- Debug logging
  RAISE NOTICE 'delete_user_account called with p_user_id: %, current_user_id: %', p_user_id, current_user_id;
  
  -- Verify user can only delete their own account
  IF current_user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You can only delete your own account'
    );
  END IF;
  
  -- Get user email for logging
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get all groups the user is a member of
  SELECT array_agg(group_id) INTO group_ids
  FROM public.group_members
  WHERE user_id = p_user_id;
  
  -- Remove user from all groups and update member counts
  IF group_ids IS NOT NULL THEN
    FOR i IN 1..array_length(group_ids, 1) LOOP
      -- Remove from group_members
      DELETE FROM public.group_members 
      WHERE group_id = group_ids[i] AND user_id = p_user_id;
      
      -- Update group member count
      UPDATE public.groups 
      SET current_members = GREATEST(0, current_members - 1)
      WHERE id = group_ids[i];
    END LOOP;
  END IF;
  
  -- Clean up user-related data (in order to avoid foreign key constraints)
  DELETE FROM public.user_karma_progress WHERE user_id = p_user_id;
  DELETE FROM public.group_member_karma WHERE user_id = p_user_id;
  DELETE FROM public.karma_activities WHERE user_id = p_user_id;
  DELETE FROM public.user_achievements WHERE user_id = p_user_id;
  DELETE FROM public.user_engagement WHERE user_id = p_user_id;
  DELETE FROM public.user_switches WHERE user_id = p_user_id;
  DELETE FROM public.chat_messages WHERE user_id = p_user_id;
  DELETE FROM public.message_reactions WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  
  -- Mark user as deleted (soft delete to preserve referential integrity)
  UPDATE auth.users 
  SET deleted_at = now()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account successfully deleted',
    'email', user_email
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Database error: ' || SQLERRM
  );
END;
$$;

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- =====================================================
-- 4. VERIFY FUNCTION EXISTS
-- =====================================================

-- This should return the function if it was created successfully
SELECT 
  routine_name,
  routine_type,
  data_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'delete_user_account';

-- =====================================================
-- 5. CLEAN UP ANY DUPLICATE/ORPHANED DATA
-- =====================================================

-- Find and log any duplicate user_ids in profiles
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id 
    FROM public.profiles 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate user_ids in profiles table', duplicate_count;
  END IF;
END $$;

-- Find and log orphaned profiles (user_id not in auth.users)
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  WHERE u.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % orphaned profiles (user_id not in auth.users)', orphaned_count;
  END IF;
END $$;

-- =====================================================
-- 6. TEST FUNCTION (OPTIONAL - ONLY IF YOU WANT TO TEST)
-- =====================================================

-- Uncomment to test function exists and has correct signature:
-- SELECT public.delete_user_account('00000000-0000-0000-0000-000000000000'::uuid);

COMMIT;