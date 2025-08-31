-- RUN ULTIMATE TEST - Simple Verification
-- This test can be run immediately to check if the fixes work

-- STEP 1: Check if the fixes are already applied
DO $$
DECLARE
  has_group_id BOOLEAN;
  has_add_user_function BOOLEAN;
  has_get_available_function BOOLEAN;
  constraint_name TEXT;
BEGIN
  RAISE NOTICE '=== CHECKING IF FIXES ARE APPLIED ===';
  
  -- Check if group_id column exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'group_id'
  ) INTO has_group_id;
  
  IF has_group_id THEN
    RAISE NOTICE '✅ group_id column exists in profiles';
  ELSE
    RAISE NOTICE '❌ group_id column missing from profiles';
  END IF;
  
  -- Check if RPC functions exist
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'add_user_to_group') INTO has_add_user_function;
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_available_groups') INTO has_get_available_function;
  
  IF has_add_user_function THEN
    RAISE NOTICE '✅ add_user_to_group function exists';
  ELSE
    RAISE NOTICE '❌ add_user_to_group function missing';
  END IF;
  
  IF has_get_available_function THEN
    RAISE NOTICE '✅ get_available_groups function exists';
  ELSE
    RAISE NOTICE '❌ get_available_groups function missing';
  END IF;
  
  -- Check constraint name
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'profiles' 
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'user_id'
      AND tc.constraint_type = 'UNIQUE'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    RAISE NOTICE '✅ User_id unique constraint found: %', constraint_name;
  ELSE
    RAISE NOTICE '❌ User_id unique constraint missing';
  END IF;
  
  -- Summary
  IF has_group_id AND has_add_user_function AND has_get_available_function AND constraint_name IS NOT NULL THEN
    RAISE NOTICE '🎉 ALL FIXES ARE APPLIED!';
  ELSE
    RAISE NOTICE '⚠️ Some fixes are missing. Run ULTIMATE_WORKING_FIX.sql first.';
  END IF;
END $$;

-- STEP 2: Test with existing data (if any)
DO $$
DECLARE
  user_count INTEGER;
  group_count INTEGER;
  profile_count INTEGER;
BEGIN
  RAISE NOTICE '=== CHECKING EXISTING DATA ===';
  
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO group_count FROM public.groups WHERE lifecycle_stage = 'active';
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  
  RAISE NOTICE 'Users: %, Groups: %, Profiles: %', user_count, group_count, profile_count;
  
  IF user_count > 0 AND group_count > 0 THEN
    RAISE NOTICE '✅ Data available for testing';
  ELSE
    RAISE NOTICE '⚠️ Need to create test data first';
  END IF;
END $$;

-- STEP 3: Test the get_available_groups function
DO $$
DECLARE
  available_count INTEGER := 0;
  test_group RECORD;
BEGIN
  RAISE NOTICE '=== TESTING get_available_groups FUNCTION ===';
  
  BEGIN
    FOR test_group IN SELECT * FROM public.get_available_groups(5) LOOP
      available_count := available_count + 1;
      RAISE NOTICE 'Available group: % (members: %/%%)', 
        test_group.name, 
        test_group.current_members, 
        test_group.max_members;
    END LOOP;
    
    IF available_count > 0 THEN
      RAISE NOTICE '✅ get_available_groups works: % groups found', available_count;
    ELSE
      RAISE NOTICE '⚠️ No available groups found (this is normal if no groups exist)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ get_available_groups failed: %', SQLERRM;
  END;
END $$;

-- STEP 4: Test profile creation (if we have a user)
DO $$
DECLARE
  test_user_id UUID;
  profile_result RECORD;
  constraint_name TEXT;
BEGIN
  RAISE NOTICE '=== TESTING PROFILE CREATION ===';
  
  -- Get a test user
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE deleted_at IS NULL 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No users available for profile test';
    RETURN;
  END IF;
  
  -- Get constraint name
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'profiles' 
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'user_id'
      AND tc.constraint_type = 'UNIQUE'
  LIMIT 1;
  
  -- Test profile creation
  BEGIN
    EXECUTE format('
      INSERT INTO public.profiles (
        user_id, username, genres, personality, habits, mood, created_at, updated_at
      ) VALUES (
        %L, %L, %L, %L, %L, %L, NOW(), NOW()
      )
      ON CONFLICT ON CONSTRAINT %I DO UPDATE SET
        username = EXCLUDED.username,
        updated_at = NOW()
      RETURNING *
    ',
      test_user_id,
      'TestUser' || substring(test_user_id::text from 1 for 8),
      ARRAY['pop', 'rock'],
      ARRAY['friendly'],
      ARRAY['active'],
      7,
      constraint_name
    ) INTO profile_result;
    
    RAISE NOTICE '✅ Profile creation test passed: %', profile_result.username;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Profile creation test failed: %', SQLERRM;
  END;
END $$;

-- STEP 5: Test group assignment (if we have users and groups)
DO $$
DECLARE
  test_user_id UUID;
  test_group_id UUID;
  rpc_result JSONB;
BEGIN
  RAISE NOTICE '=== TESTING GROUP ASSIGNMENT ===';
  
  -- Get a test user
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE deleted_at IS NULL 
  LIMIT 1;
  
  -- Get a test group
  SELECT id INTO test_group_id 
  FROM public.groups 
  WHERE lifecycle_stage = 'active' 
  LIMIT 1;
  
  IF test_user_id IS NULL OR test_group_id IS NULL THEN
    RAISE NOTICE '⚠️ Need both user and group for assignment test';
    RETURN;
  END IF;
  
  -- Test the RPC function
  BEGIN
    SELECT public.add_user_to_group(test_group_id, test_user_id) INTO rpc_result;
    
    IF (rpc_result->>'success')::boolean THEN
      RAISE NOTICE '✅ Group assignment test passed: %', rpc_result->>'message';
    ELSE
      RAISE NOTICE '⚠️ Group assignment test result: %', rpc_result->>'error';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Group assignment test failed: %', SQLERRM;
  END;
END $$;

-- STEP 6: Summary
SELECT 
  'ULTIMATE TEST COMPLETED' as status,
  'Check the NOTICE messages above for detailed results.' as details,
  'If you see ✅ messages, the fixes are working correctly.' as recommendation;
