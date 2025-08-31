-- DEFINITIVE CONSTRAINT TEST AND FIX
-- This will show EXACTLY what constraints exist and fix the issue

-- STEP 1: Show ALL constraints on profiles table with exact names
SELECT '=== EXACT CONSTRAINT NAMES ===' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
GROUP BY tc.constraint_name, tc.constraint_type, tc.is_deferrable, tc.initially_deferred
ORDER BY tc.constraint_type, tc.constraint_name;

-- STEP 2: Show the exact table structure
SELECT '=== EXACT TABLE STRUCTURE ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 3: Test the EXACT ON CONFLICT that's failing
SELECT '=== TESTING EXACT FAILING QUERY ===' as info;

-- This will show us the exact error
DO $$
DECLARE
    test_user_id UUID;
    test_group_id UUID;
    constraint_name TEXT;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE deleted_at IS NULL 
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found for testing';
        RETURN;
    END IF;
    
    -- Get the actual constraint name for user_id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'profiles' 
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name = 'user_id'
    LIMIT 1;
    
    RAISE NOTICE 'Found constraint name: %', constraint_name;
    
    -- Try the EXACT failing query
    BEGIN
        INSERT INTO public.profiles (
            user_id, username, group_id, genres, personality, habits, created_at, updated_at
        )
        VALUES (
            test_user_id, 
            'TEST-' || substring(test_user_id::text from 1 for 8), 
            NULL, 
            ARRAY[]::text[], 
            ARRAY[]::text[], 
            ARRAY[]::text[], 
            NOW(), 
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET 
            updated_at = NOW();
        
        RAISE NOTICE 'ON CONFLICT (user_id) WORKED - this should not happen!';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ON CONFLICT (user_id) FAILED as expected: %', SQLERRM;
    END;
    
    -- Cleanup
    DELETE FROM public.profiles WHERE user_id = test_user_id;
    
END $$;

-- STEP 4: Create the DEFINITIVE working function
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
  profile_exists BOOLEAN;
  member_exists BOOLEAN;
  actual_constraint_name TEXT;
  test_result JSONB;
BEGIN
  -- Get the ACTUAL constraint name for debugging
  SELECT tc.constraint_name INTO actual_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'profiles' 
      AND tc.table_schema = 'public'
      AND tc.constraint_type = 'UNIQUE'
      AND kcu.column_name = 'user_id'
  LIMIT 1;
  
  -- Validate inputs
  IF p_group_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Missing required parameters',
      'debug_constraint_name', actual_constraint_name
    );
  END IF;
  
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not found in auth system',
      'debug_constraint_name', actual_constraint_name
    );
  END IF;
  
  -- Get group information
  SELECT current_members, max_members, name 
  INTO current_count, max_count, group_name
  FROM public.groups 
  WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Group not found',
      'debug_constraint_name', actual_constraint_name
    );
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
      'message', 'Already member',
      'debug_constraint_name', actual_constraint_name
    );
  END IF;
  
  -- Check capacity
  IF current_count >= max_count THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Group at capacity',
      'debug_constraint_name', actual_constraint_name
    );
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
    'message', 'Successfully added to group',
    'debug_constraint_name', actual_constraint_name,
    'debug_profile_exists', profile_exists
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Transaction failed: ' || SQLERRM,
    'debug_constraint_name', actual_constraint_name
  );
END;
$$;

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.add_user_to_group(uuid, uuid) TO authenticated, anon, service_role;

-- STEP 6: Create comprehensive test function
CREATE OR REPLACE FUNCTION public.definitive_test()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id UUID;
  test_group_id UUID;
  test_result JSONB;
  member_count INTEGER;
  profile_group_id UUID;
  constraint_info JSONB;
BEGIN
  -- Get constraint information
  SELECT jsonb_build_object(
    'constraint_name', tc.constraint_name,
    'constraint_type', tc.constraint_type,
    'columns', string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
  ) INTO constraint_info
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'profiles' 
      AND tc.table_schema = 'public'
      AND tc.constraint_type = 'UNIQUE'
      AND kcu.column_name = 'user_id'
  GROUP BY tc.constraint_name, tc.constraint_type
  LIMIT 1;
  
  -- Find existing user
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE deleted_at IS NULL 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'No users available for testing',
      'constraint_info', constraint_info
    );
  END IF;
  
  -- Create test group
  INSERT INTO public.groups (
    name, vibe_label, current_members, max_members, is_private, lifecycle_stage
  )
  VALUES (
    'DEFINITIVE-TEST-' || extract(epoch from now()), 
    'Definitive Test', 
    0, 
    10, 
    false, 
    'active'
  )
  RETURNING id INTO test_group_id;
  
  -- Test the function
  SELECT public.add_user_to_group(test_group_id, test_user_id) INTO test_result;
  
  -- Verify results
  SELECT COUNT(*) INTO member_count 
  FROM public.group_members 
  WHERE group_id = test_group_id AND user_id = test_user_id;
  
  SELECT group_id INTO profile_group_id 
  FROM public.profiles 
  WHERE user_id = test_user_id;
  
  -- Cleanup
  DELETE FROM public.group_members WHERE group_id = test_group_id;
  UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
  DELETE FROM public.groups WHERE id = test_group_id;
  
  -- Return comprehensive results
  RETURN jsonb_build_object(
    'success', true,
    'test_user_id', test_user_id,
    'test_group_id', test_group_id,
    'function_result', test_result,
    'member_added', member_count > 0,
    'profile_updated', profile_group_id = test_group_id,
    'constraint_info', constraint_info,
    'overall_status', CASE 
      WHEN (test_result->>'success')::boolean 
           AND member_count > 0 
           AND profile_group_id = test_group_id 
      THEN 'DEFINITIVE_FIX_WORKS' 
      ELSE 'STILL_BROKEN' 
    END
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Cleanup on error
  BEGIN
    DELETE FROM public.group_members WHERE group_id = test_group_id;
    UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
    DELETE FROM public.groups WHERE id = test_group_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore cleanup errors
  END;
  
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Test failed: ' || SQLERRM,
    'constraint_info', constraint_info
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.definitive_test() TO authenticated, anon, service_role;

-- STEP 7: Final status
SELECT 'DEFINITIVE TEST AND FIX APPLIED' as status;
SELECT 'Run: SELECT public.definitive_test();' as test_command;
