-- DEBUG USER ISSUES
-- Run in Supabase SQL Editor to diagnose user ID and RPC function problems

-- =====================================================
-- 1. CHECK IF delete_user_account FUNCTION EXISTS
-- =====================================================

-- List all functions in public schema
SELECT 
  routine_name,
  routine_type,
  data_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%delete%user%'
ORDER BY routine_name;

-- =====================================================
-- 2. CHECK FOR DUPLICATE USER IDs IN PROFILES
-- =====================================================

-- Find duplicate user_ids in profiles table
SELECT 
  user_id, 
  COUNT(*) as count,
  STRING_AGG(username, ', ') as usernames
FROM public.profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- =====================================================
-- 3. CHECK FOR ORPHANED PROFILES (user_id not in auth.users)
-- =====================================================

-- Find profiles where user_id doesn't exist in auth.users
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- =====================================================
-- 4. CHECK FOR USERS WITHOUT PROFILES
-- =====================================================

-- Find auth users without profiles
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.deleted_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL 
  AND u.deleted_at IS NULL;

-- =====================================================
-- 5. CHECK GROUP MEMBERSHIP CONSISTENCY
-- =====================================================

-- Find group_members with invalid user_ids
SELECT 
  gm.id,
  gm.user_id,
  gm.group_id,
  p.username
FROM public.group_members gm
LEFT JOIN public.profiles p ON gm.user_id = p.user_id
WHERE p.user_id IS NULL;

-- =====================================================
-- 6. CHECK RPC FUNCTION PERMISSIONS
-- =====================================================

-- Check function permissions for delete_user_account
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name = 'delete_user_account'
  AND routine_schema = 'public';

-- =====================================================
-- 7. MANUAL TEST: Create delete_user_account function if missing
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(user_id_to_delete uuid)
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
  
  -- Verify user can only delete their own account
  IF current_user_id != user_id_to_delete THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You can only delete your own account'
    );
  END IF;
  
  -- Get user email for logging
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = user_id_to_delete;
  
  -- Get all groups the user is a member of
  SELECT array_agg(group_id) INTO group_ids
  FROM public.group_members
  WHERE user_id = user_id_to_delete;
  
  -- Remove user from all groups and update member counts
  IF group_ids IS NOT NULL THEN
    FOR i IN 1..array_length(group_ids, 1) LOOP
      -- Use the existing remove_user_from_group function if it exists
      BEGIN
        PERFORM public.remove_user_from_group(group_ids[i], user_id_to_delete);
      EXCEPTION WHEN OTHERS THEN
        -- If function doesn't exist, manually remove
        DELETE FROM public.group_members 
        WHERE group_id = group_ids[i] AND user_id = user_id_to_delete;
        
        -- Update group member count
        UPDATE public.groups 
        SET current_members = GREATEST(0, current_members - 1)
        WHERE id = group_ids[i];
      END;
    END LOOP;
  END IF;
  
  -- Clean up user-related data
  DELETE FROM public.user_karma_progress WHERE user_id = user_id_to_delete;
  DELETE FROM public.group_member_karma WHERE user_id = user_id_to_delete;
  DELETE FROM public.karma_activities WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_achievements WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_engagement WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_switches WHERE user_id = user_id_to_delete;
  DELETE FROM public.profiles WHERE user_id = user_id_to_delete;
  
  -- Mark user as deleted (soft delete to preserve referential integrity)
  UPDATE auth.users 
  SET deleted_at = now()
  WHERE id = user_id_to_delete;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account successfully deleted',
    'email', user_email
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- =====================================================
-- 8. TEST USER ID GENERATION
-- =====================================================

-- Check if there are any invalid UUIDs in profiles
SELECT 
  user_id,
  username,
  CASE 
    WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN 'Valid UUID'
    ELSE 'Invalid UUID'
  END as uuid_status
FROM public.profiles
WHERE user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Show recent user creation patterns
SELECT 
  u.id as user_id,
  u.email,
  p.username,
  u.created_at as auth_created,
  p.created_at as profile_created,
  EXTRACT(EPOCH FROM (p.created_at - u.created_at)) as delay_seconds
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;