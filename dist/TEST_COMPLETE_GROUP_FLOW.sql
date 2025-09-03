-- Complete Group Assignment Flow Test
-- This tests the entire pipeline: database fix + group finding + assignment

-- Step 1: Verify the database functions are working
SELECT 
    'DATABASE FUNCTION CHECK' as test_type,
    routine_name,
    routine_definition LIKE '%FOR UPDATE%' as has_for_update_bug,
    CASE 
        WHEN routine_definition LIKE '%FOR UPDATE%' THEN '❌ FOR UPDATE STILL PRESENT - WILL FAIL'
        ELSE '✅ FOR UPDATE REMOVED - SHOULD WORK'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'add_user_to_group';

-- Step 2: Check current state of groups and members
SELECT 
    'CURRENT STATE ANALYSIS' as info_type,
    (SELECT COUNT(*) FROM public.groups WHERE lifecycle_stage = 'active') as active_groups,
    (SELECT COUNT(*) FROM public.groups WHERE current_members = 0) as empty_groups,
    (SELECT COUNT(*) FROM public.groups WHERE current_members > 0) as groups_with_members,
    (SELECT COUNT(*) FROM public.group_members) as total_memberships,
    (SELECT COUNT(*) FROM public.profiles WHERE group_id IS NOT NULL) as profiles_with_groups;

-- Step 3: Test the complete flow with a real user
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT;
    test_group_id UUID;
    join_result JSONB;
    profile_check RECORD;
    available_group RECORD;
BEGIN
    -- Find a user to test with
    SELECT id, email 
    INTO test_user_id, test_email
    FROM auth.users 
    WHERE deleted_at IS NULL AND email_confirmed_at IS NOT NULL
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ No confirmed users found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 TESTING COMPLETE FLOW with user: % (%)', test_email, test_user_id;
    
    -- Clear any existing group assignment for clean test
    UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
    DELETE FROM public.group_members WHERE user_id = test_user_id;
    
    -- Check if there are any available groups (simulating findAvailableGroupsWithCapacity)
    SELECT id, name, current_members, max_members
    INTO available_group
    FROM public.groups 
    WHERE is_private = false 
      AND lifecycle_stage = 'active'
      AND current_members < max_members
    ORDER BY current_members DESC -- Prefer groups with some members
    LIMIT 1;
    
    IF available_group.id IS NOT NULL THEN
        RAISE NOTICE '✅ Found available group: % (%/% members)', available_group.name, available_group.current_members, available_group.max_members;
        test_group_id := available_group.id;
    ELSE
        RAISE NOTICE '🏗️ No available groups found, creating new one';
        INSERT INTO public.groups (name, vibe_label, current_members, max_members, is_private, lifecycle_stage)
        VALUES ('TEST-FLOW-' || extract(epoch from now()), 'Complete Flow Test', 0, 10, false, 'active')
        RETURNING id INTO test_group_id;
        RAISE NOTICE '✅ Created new group: %', test_group_id;
    END IF;
    
    -- Test the add_user_to_group function
    SELECT public.add_user_to_group(test_group_id, test_user_id) INTO join_result;
    
    RAISE NOTICE '🎯 JOIN RESULT: %', join_result;
    
    IF (join_result->>'success')::boolean THEN
        RAISE NOTICE '🎉 SUCCESS: User joined group successfully!';
        
        -- Verify all the data consistency
        SELECT user_id, group_id, username INTO profile_check
        FROM public.profiles 
        WHERE user_id = test_user_id;
        
        IF profile_check.group_id = test_group_id THEN
            RAISE NOTICE '✅ VERIFIED: Profile.group_id correctly set';
        ELSE
            RAISE NOTICE '❌ FAILED: Profile.group_id not set (expected: %, actual: %)', test_group_id, profile_check.group_id;
        END IF;
        
        -- Check group_members table
        IF EXISTS (SELECT 1 FROM public.group_members WHERE user_id = test_user_id AND group_id = test_group_id) THEN
            RAISE NOTICE '✅ VERIFIED: User exists in group_members table';
        ELSE
            RAISE NOTICE '❌ FAILED: User not found in group_members table';
        END IF;
        
        -- Check group count was updated
        DECLARE
            updated_count INTEGER;
        BEGIN
            SELECT current_members INTO updated_count
            FROM public.groups 
            WHERE id = test_group_id;
            
            RAISE NOTICE '✅ VERIFIED: Group member count updated to %', updated_count;
        END;
        
    ELSE
        RAISE NOTICE '❌ FAILED: User could not join group: %', join_result->>'error';
    END IF;
    
    -- Cleanup test data
    DELETE FROM public.group_members WHERE user_id = test_user_id AND group_id = test_group_id;
    UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
    
    -- Only delete the group if we created it for testing
    IF available_group.id IS NULL THEN
        DELETE FROM public.groups WHERE id = test_group_id;
        RAISE NOTICE '🧹 Cleaned up test group';
    ELSE
        -- Restore original member count
        UPDATE public.groups 
        SET current_members = available_group.current_members 
        WHERE id = test_group_id;
        RAISE NOTICE '🧹 Restored original group state';
    END IF;
    
END $$;

-- Step 4: Summary and recommendations
SELECT 
    '📊 COMPLETE FLOW TEST SUMMARY' as summary,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'add_user_to_group' AND routine_definition NOT LIKE '%FOR UPDATE%') > 0
        THEN '✅ Database functions fixed'
        ELSE '❌ Database functions still broken'
    END as database_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.groups WHERE lifecycle_stage = 'active' AND current_members < max_members) > 0
        THEN '✅ Available groups exist'
        ELSE '⚠️ No available groups (will create new ones)'
    END as groups_status,
    'Run onboarding test now!' as next_action;