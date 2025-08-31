-- ULTIMATE FIX FOR ON CONFLICT ERROR
-- This will definitively solve the constraint mismatch issue

-- Step 1: See what constraints actually exist
SELECT 'CURRENT CONSTRAINTS ON profiles:' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
GROUP BY tc.constraint_name, tc.constraint_type
ORDER BY tc.constraint_type;

-- Step 2: Drop the current problematic function
DROP FUNCTION IF EXISTS public.add_user_to_group(uuid, uuid) CASCADE;

-- Step 3: Create a NEW function that handles the constraint correctly
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
  profile_exists BOOLEAN;
  member_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_group_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required parameters');
  END IF;
  
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth system');
  END IF;
  
  -- Get group information
  SELECT current_members, max_members, name 
  INTO current_count, max_count, group_name
  FROM public.groups 
  WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found');
  END IF;
  
  -- Check if already member
  SELECT EXISTS(
    SELECT 1 FROM public.group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) INTO member_exists;
  
  IF member_exists THEN
    -- Just update profile to ensure consistency
    UPDATE public.profiles 
    SET group_id = p_group_id, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'group_id', p_group_id, 
      'group_name', group_name, 
      'message', 'Already member'
    );
  END IF;
  
  -- Check capacity
  IF current_count >= max_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group at capacity');
  END IF;
  
  -- Add to group_members
  INSERT INTO public.group_members (group_id, user_id, joined_at)
  VALUES (p_group_id, p_user_id, NOW());
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = p_user_id) INTO profile_exists;
  
  IF profile_exists THEN
    -- Profile exists - just update it
    UPDATE public.profiles 
    SET group_id = p_group_id, updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Profile doesn't exist - create it WITHOUT ON CONFLICT
    BEGIN
      INSERT INTO public.profiles (
        user_id, username, group_id, genres, personality, habits, created_at, updated_at
      )
      VALUES (
        p_user_id, 
        'User' || substring(p_user_id::text from 1 for 8), 
        p_group_id, 
        ARRAY[]::text[], 
        ARRAY[]::text[], 
        ARRAY[]::text[], 
        NOW(), 
        NOW()
      );
    EXCEPTION WHEN unique_violation THEN
      -- If somehow the profile was created between our check and insert
      UPDATE public.profiles 
      SET group_id = p_group_id, updated_at = NOW()
      WHERE user_id = p_user_id;
    END;
  END IF;
  
  -- Update group count
  UPDATE public.groups 
  SET current_members = current_count + 1
  WHERE id = p_group_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'group_id', p_group_id,
    'group_name', group_name,
    'current_members', current_count + 1,
    'message', 'Successfully added to group'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Transaction failed: ' || SQLERRM);
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.add_user_to_group(uuid, uuid) TO authenticated, anon, service_role;

-- Step 5: Test the new function
CREATE OR REPLACE FUNCTION public.test_new_add_function()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id UUID;
  test_group_id UUID;
  test_result JSONB;
BEGIN
  -- Find existing user
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE deleted_at IS NULL 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No users available for testing');
  END IF;
  
  -- Create test group
  INSERT INTO public.groups (
    name, vibe_label, current_members, max_members, is_private, lifecycle_stage
  )
  VALUES (
    'CONFLICT-TEST-' || extract(epoch from now()), 
    'Conflict Test', 
    0, 
    10, 
    false, 
    'active'
  )
  RETURNING id INTO test_group_id;
  
  -- Test the function
  SELECT public.add_user_to_group(test_group_id, test_user_id) INTO test_result;
  
  -- Cleanup
  DELETE FROM public.group_members WHERE group_id = test_group_id;
  UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
  DELETE FROM public.groups WHERE id = test_group_id;
  
  RETURN jsonb_build_object(
    'test_user_id', test_user_id,
    'function_result', test_result,
    'status', CASE 
      WHEN (test_result->>'success')::boolean THEN 'FIXED' 
      ELSE 'STILL_BROKEN' 
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_new_add_function() TO authenticated, anon, service_role;

SELECT 'ULTIMATE CONFLICT FIX APPLIED - Test with: SELECT public.test_new_add_function();' as status;
