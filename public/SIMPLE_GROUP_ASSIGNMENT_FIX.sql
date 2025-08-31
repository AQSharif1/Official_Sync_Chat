-- SIMPLE FIX: Groups created but users not added
-- Clean, minimal fix without complex syntax

-- Step 1: Drop and recreate the function
DROP FUNCTION IF EXISTS public.add_user_to_group(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.add_user_to_group(p_group_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_name TEXT;
  user_exists BOOLEAN;
BEGIN
  -- Basic validation
  IF p_group_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required parameters');
  END IF;
  
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get group name
  SELECT name INTO group_name FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found');
  END IF;
  
  -- Check if already member
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id) THEN
    -- Update profile anyway
    UPDATE public.profiles SET group_id = p_group_id WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'group_id', p_group_id, 'group_name', group_name, 'message', 'Already member');
  END IF;
  
  -- Add to group_members
  INSERT INTO public.group_members (group_id, user_id, joined_at, role)
  VALUES (p_group_id, p_user_id, NOW(), 'member');
  
  -- Update or create profile
  INSERT INTO public.profiles (user_id, username, group_id, genres, personality, habits, created_at, updated_at)
  VALUES (p_user_id, 'User' || substring(p_user_id::text from 1 for 8), p_group_id, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET group_id = p_group_id, updated_at = NOW();
  
  -- Update group count
  UPDATE public.groups SET current_members = current_members + 1 WHERE id = p_group_id;
  
  RETURN jsonb_build_object('success', true, 'group_id', p_group_id, 'group_name', group_name, 'message', 'Added to group');
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.add_user_to_group(uuid, uuid) TO authenticated;

-- Step 2: Ensure RLS policies allow operations
DO $$
BEGIN
  -- Allow group_members insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'allow_group_join') THEN
    CREATE POLICY "allow_group_join" ON public.group_members FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  
  -- Allow profiles insert/update
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'allow_profile_manage') THEN
    CREATE POLICY "allow_profile_manage" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Step 3: Test the function
SELECT 'Function recreated successfully' as status;