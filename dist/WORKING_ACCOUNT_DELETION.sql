-- WORKING Account Deletion Function - Matches Your Actual Database Schema
-- This fixes the "relation does not exist" errors by only referencing existing tables

-- Drop existing broken function
DROP FUNCTION IF EXISTS public.delete_user_account(uuid);

-- Create corrected function that only uses tables that exist in your schema
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
  
  -- Verify user exists and get email
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Track deletions from EXISTING tables only
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
  deleted_reactions AS (
    DELETE FROM public.message_reactions 
    WHERE user_id = p_user_id 
    RETURNING id
  ),
  deleted_profiles AS (
    DELETE FROM public.profiles 
    WHERE user_id = p_user_id 
    RETURNING user_id
  ),
  updated_groups AS (
    UPDATE public.groups 
    SET current_members = GREATEST(0, current_members - 1)
    WHERE id IN (SELECT group_id FROM deleted_group_memberships)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'group_memberships_deleted', (SELECT COUNT(*) FROM deleted_group_memberships),
    'chat_messages_deleted', (SELECT COUNT(*) FROM deleted_chat_messages),
    'reactions_deleted', (SELECT COUNT(*) FROM deleted_reactions),
    'profiles_deleted', (SELECT COUNT(*) FROM deleted_profiles),
    'groups_updated', (SELECT COUNT(*) FROM updated_groups)
  ) INTO v_deleted_records;

  -- Soft delete from auth.users (preserve referential integrity)
  UPDATE auth.users 
  SET deleted_at = now()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account successfully deleted',
    'email', user_email,
    'deleted_records', v_deleted_records
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Database error: ' || SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- Verify function was created successfully
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'delete_user_account';

-- Test query to verify tables exist (should not error)
DO $$
BEGIN
  -- Check that all referenced tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table public.profiles does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table public.group_members does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table public.chat_messages does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reactions' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table public.message_reactions does not exist';
  END IF;
  
  RAISE NOTICE 'All required tables exist - function should work correctly';
END $$;

COMMIT;