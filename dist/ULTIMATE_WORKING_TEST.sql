-- ULTIMATE WORKING TEST - Complete Onboarding Flow Verification
-- This test will work regardless of the current database state

-- STEP 1: Check current database state
DO $$
DECLARE
  profiles_columns TEXT[];
  groups_columns TEXT[];
  group_members_columns TEXT[];
  constraint_name TEXT;
BEGIN
  RAISE NOTICE '=== DATABASE STATE ANALYSIS ===';
  
  -- Check profiles table structure
  SELECT array_agg(column_name ORDER BY ordinal_position) INTO profiles_columns
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND table_schema = 'public';
  
  RAISE NOTICE 'Profiles columns: %', profiles_columns;
  
  -- Check groups table structure
  SELECT array_agg(column_name ORDER BY ordinal_position) INTO groups_columns
  FROM information_schema.columns 
  WHERE table_name = 'groups' AND table_schema = 'public';
  
  RAISE NOTICE 'Groups columns: %', groups_columns;
  
  -- Check group_members table structure
  SELECT array_agg(column_name ORDER BY ordinal_position) INTO group_members_columns
  FROM information_schema.columns 
  WHERE table_name = 'group_members' AND table_schema = 'public';
  
  RAISE NOTICE 'Group_members columns: %', group_members_columns;
  
  -- Check user_id constraint name
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
  
  RAISE NOTICE 'User_id unique constraint name: %', constraint_name;
  
  -- Check if RPC functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_to_group') THEN
    RAISE NOTICE '✅ add_user_to_group function exists';
  ELSE
    RAISE NOTICE '❌ add_user_to_group function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_available_groups') THEN
    RAISE NOTICE '✅ get_available_groups function exists';
  ELSE
    RAISE NOTICE '❌ get_available_groups function missing';
  END IF;
END $$;

-- STEP 2: Create test user (bypass email verification)
DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT := 'test.user.' || extract(epoch from now()) || '@test.com';
BEGIN
  RAISE NOTICE '=== CREATING TEST USER ===';
  
  -- Insert directly into auth.users (bypass email verification)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    test_email,
    crypt('testpassword123', gen_salt('bf')),
    NOW(), -- Email already confirmed
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
  ) RETURNING id INTO test_user_id;
  
  RAISE NOTICE '✅ Created test user: % with email: %', test_user_id, test_email;
  
  -- Store the test user ID for later use
  PERFORM set_config('app.test_user_id', test_user_id::text, false);
END $$;

-- STEP 3: Test profile creation with current schema
DO $$
DECLARE
  test_user_id UUID;
  profile_result RECORD;
  constraint_name TEXT;
BEGIN
  RAISE NOTICE '=== TESTING PROFILE CREATION ===';
  
  -- Get the test user ID
  test_user_id := current_setting('app.test_user_id')::UUID;
  
  -- Get the actual constraint name
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
  
  RAISE NOTICE 'Using constraint name: %', constraint_name;
  
  -- Test profile creation with dynamic SQL based on actual schema
  EXECUTE format('
    INSERT INTO public.profiles (
      user_id,
      username,
      genres,
      personality,
      habits,
      mood,
      created_at,
      updated_at
    ) VALUES (
      %L,
      %L,
      %L,
      %L,
      %L,
      %L,
      NOW(),
      NOW()
    )
    ON CONFLICT ON CONSTRAINT %I DO UPDATE SET
      username = EXCLUDED.username,
      genres = EXCLUDED.genres,
      personality = EXCLUDED.personality,
      habits = EXCLUDED.habits,
      mood = EXCLUDED.mood,
      updated_at = NOW()
    RETURNING *
  ', 
    test_user_id,
    'TestUser' || substring(test_user_id::text from 1 for 8),
    ARRAY['pop', 'rock', 'jazz'],
    ARRAY['friendly', 'creative', 'adventurous'],
    ARRAY['morning_person', 'fitness_enthusiast'],
    7,
    constraint_name
  ) INTO profile_result;
  
  RAISE NOTICE '✅ Profile created successfully: %', profile_result.username;
  
  -- Verify profile was created
  IF profile_result.id IS NOT NULL THEN
    RAISE NOTICE '✅ Profile creation: PASSED';
  ELSE
    RAISE NOTICE '❌ Profile creation: FAILED';
  END IF;
END $$;

-- STEP 4: Test group creation and assignment
DO $$
DECLARE
  test_user_id UUID;
  test_group_id UUID;
  rpc_result JSONB;
  member_count INTEGER;
  profile_group_id UUID;
BEGIN
  RAISE NOTICE '=== TESTING GROUP ASSIGNMENT ===';
  
  -- Get the test user ID
  test_user_id := current_setting('app.test_user_id')::UUID;
  
  -- Create a test group
  INSERT INTO public.groups (
    name,
    vibe_label,
    current_members,
    max_members,
    is_private,
    lifecycle_stage
  ) VALUES (
    'TEST-GROUP-' || extract(epoch from now()),
    'Test Group Vibe',
    0,
    10,
    false,
    'active'
  ) RETURNING id INTO test_group_id;
  
  RAISE NOTICE '✅ Created test group: %', test_group_id;
  
  -- Test the add_user_to_group RPC function
  BEGIN
    SELECT public.add_user_to_group(test_group_id, test_user_id) INTO rpc_result;
    RAISE NOTICE '✅ RPC call successful: %', rpc_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ RPC call failed: %', SQLERRM;
    rpc_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  
  -- Verify the results
  SELECT COUNT(*) INTO member_count 
  FROM public.group_members 
  WHERE group_id = test_group_id AND user_id = test_user_id;
  
  SELECT group_id INTO profile_group_id 
  FROM public.profiles 
  WHERE user_id = test_user_id;
  
  -- Check if everything worked
  IF (rpc_result->>'success')::boolean AND member_count > 0 AND profile_group_id = test_group_id THEN
    RAISE NOTICE '✅ Group assignment: PASSED';
    RAISE NOTICE '  - RPC success: %', (rpc_result->>'success')::boolean;
    RAISE NOTICE '  - Member count: %', member_count;
    RAISE NOTICE '  - Profile group_id: %', profile_group_id;
  ELSE
    RAISE NOTICE '❌ Group assignment: FAILED';
    RAISE NOTICE '  - RPC success: %', (rpc_result->>'success')::boolean;
    RAISE NOTICE '  - Member count: %', member_count;
    RAISE NOTICE '  - Profile group_id: %', profile_group_id;
    RAISE NOTICE '  - RPC error: %', rpc_result->>'error';
  END IF;
  
  -- Test the get_available_groups RPC
  BEGIN
    DECLARE
      available_groups RECORD;
      group_count INTEGER := 0;
    BEGIN
      FOR available_groups IN 
        SELECT * FROM public.get_available_groups(10)
      LOOP
        group_count := group_count + 1;
        RAISE NOTICE 'Available group: % (members: %/%%)', 
          available_groups.name, 
          available_groups.current_members, 
          available_groups.max_members;
      END LOOP;
      
      IF group_count > 0 THEN
        RAISE NOTICE '✅ get_available_groups: PASSED (% groups found)', group_count;
      ELSE
        RAISE NOTICE '❌ get_available_groups: FAILED (no groups found)';
      END IF;
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ get_available_groups failed: %', SQLERRM;
  END;
  
  -- Clean up test data
  DELETE FROM public.group_members WHERE group_id = test_group_id;
  UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
  DELETE FROM public.groups WHERE id = test_group_id;
  
  RAISE NOTICE '🧹 Test data cleaned up';
END $$;

-- STEP 5: Test complete onboarding flow simulation
DO $$
DECLARE
  test_user_id UUID;
  test_group_id UUID;
  onboarding_result JSONB;
  final_profile RECORD;
  final_membership RECORD;
  constraint_name TEXT;
BEGIN
  RAISE NOTICE '=== TESTING COMPLETE ONBOARDING FLOW ===';
  
  -- Get the test user ID
  test_user_id := current_setting('app.test_user_id')::UUID;
  
  -- Get the actual constraint name
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
  
  -- Simulate the complete onboarding flow
  -- Step 1: Create/update profile with user preferences (simulate onboarding completion)
  EXECUTE format('
    INSERT INTO public.profiles (
      user_id,
      username,
      genres,
      personality,
      habits,
      mood,
      created_at,
      updated_at
    ) VALUES (
      %L,
      %L,
      %L,
      %L,
      %L,
      %L,
      NOW(),
      NOW()
    )
    ON CONFLICT ON CONSTRAINT %I DO UPDATE SET
      username = EXCLUDED.username,
      genres = EXCLUDED.genres,
      personality = EXCLUDED.personality,
      habits = EXCLUDED.habits,
      mood = EXCLUDED.mood,
      updated_at = NOW()
  ', 
    test_user_id,
    'OnboardingTestUser',
    ARRAY['pop', 'rock'],
    ARRAY['friendly', 'outgoing'],
    ARRAY['early_bird', 'social'],
    8,
    constraint_name
  );
  
  RAISE NOTICE '✅ Profile updated with onboarding data';
  
  -- Step 2: Create a group for the user
  INSERT INTO public.groups (
    name,
    vibe_label,
    current_members,
    max_members,
    is_private,
    lifecycle_stage
  ) VALUES (
    'ONBOARDING-TEST-' || extract(epoch from now()),
    'Onboarding Test Group',
    0,
    10,
    false,
    'active'
  ) RETURNING id INTO test_group_id;
  
  RAISE NOTICE '✅ Created group for onboarding test: %', test_group_id;
  
  -- Step 3: Add user to group (this is what the onboarding completion does)
  BEGIN
    SELECT public.add_user_to_group(test_group_id, test_user_id) INTO onboarding_result;
    RAISE NOTICE '✅ Onboarding completion result: %', onboarding_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Onboarding completion failed: %', SQLERRM;
    onboarding_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  
  -- Step 4: Verify the complete flow worked
  SELECT * INTO final_profile FROM public.profiles WHERE user_id = test_user_id;
  SELECT * INTO final_membership FROM public.group_members WHERE user_id = test_user_id AND group_id = test_group_id;
  
  IF final_profile.group_id = test_group_id AND final_membership.group_id = test_group_id THEN
    RAISE NOTICE '✅ Complete onboarding flow: PASSED';
    RAISE NOTICE '  - Profile group_id: %', final_profile.group_id;
    RAISE NOTICE '  - Group membership: %', final_membership.group_id;
    RAISE NOTICE '  - Username: %', final_profile.username;
    RAISE NOTICE '  - Genres: %', final_profile.genres;
  ELSE
    RAISE NOTICE '❌ Complete onboarding flow: FAILED';
    RAISE NOTICE '  - Profile group_id: %', final_profile.group_id;
    RAISE NOTICE '  - Expected group_id: %', test_group_id;
    RAISE NOTICE '  - Group membership exists: %', final_membership.group_id IS NOT NULL;
  END IF;
  
  -- Clean up
  DELETE FROM public.group_members WHERE group_id = test_group_id;
  UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
  DELETE FROM public.groups WHERE id = test_group_id;
  
  RAISE NOTICE '🧹 Onboarding test data cleaned up';
END $$;

-- STEP 6: Final verification and cleanup
DO $$
DECLARE
  test_user_id UUID;
  profile_exists BOOLEAN;
  user_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== FINAL VERIFICATION ===';
  
  -- Get the test user ID
  test_user_id := current_setting('app.test_user_id')::UUID;
  
  -- Check if test user still exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = test_user_id) INTO profile_exists;
  
  RAISE NOTICE 'Final verification:';
  RAISE NOTICE '  - Test user exists: %', user_exists;
  RAISE NOTICE '  - Test profile exists: %', profile_exists;
  
  -- Clean up test user and profile
  DELETE FROM public.profiles WHERE user_id = test_user_id;
  DELETE FROM auth.users WHERE id = test_user_id;
  
  RAISE NOTICE '🧹 Test user and profile cleaned up';
END $$;

-- STEP 7: Summary report
SELECT 
  'ULTIMATE TEST COMPLETED' as status,
  'All tests have been run. Check the NOTICE messages above for detailed results.' as details,
  'Look for ✅ PASSED messages to confirm the fixes are working correctly.' as recommendation;
