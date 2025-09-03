-- TEST ONBOARDING FLOW: Create fake user and test group assignment
-- Run this in Supabase SQL Editor to test the functionality

-- 1. First, check if the RPC functions are properly updated
SELECT 
    routine_name,
    routine_type,
    security_type,
    specific_name
FROM information_schema.routines 
WHERE routine_name IN ('add_user_to_group', 'remove_user_from_group')
AND routine_schema = 'public'
ORDER BY routine_name;

-- 2. Check current database state
SELECT 
    'Groups' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN lifecycle_stage = 'active' THEN 1 END) as active_count
FROM public.groups
UNION ALL
SELECT 
    'Profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END) as with_group_count
FROM public.profiles
UNION ALL
SELECT 
    'Group Members' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT user_id) as unique_users
FROM public.group_members;

-- 3. Create a test user profile (simulating successful auth signup)
-- Note: We'll use a fake UUID for testing since we can't create actual auth users via SQL
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    test_group_id UUID;
    test_result JSONB;
BEGIN
    -- Clean up any existing test data
    DELETE FROM public.group_members WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE user_id = test_user_id;
    DELETE FROM public.groups WHERE name LIKE 'test-group-%';
    
    RAISE NOTICE '🧪 Starting onboarding simulation for test user: %', test_user_id;
    
    -- Step 1: Create user profile (simulating onboarding completion)
    INSERT INTO public.profiles (
        user_id, 
        username, 
        genres, 
        personality, 
        habits,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test-user-123',
        ARRAY['rock', 'pop'],
        ARRAY['creative', 'outgoing'],
        ARRAY['music', 'gaming'],
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Step 1: Profile created for user %', test_user_id;
    
    -- Step 2: Create a test group (simulating group creation)
    INSERT INTO public.groups (
        name,
        vibe_label,
        current_members,
        max_members,
        is_private,
        lifecycle_stage,
        created_at
    ) VALUES (
        'test-group-' || EXTRACT(EPOCH FROM NOW()),
        'Test Vibes',
        0,
        10,
        false,
        'active',
        NOW()
    ) RETURNING id INTO test_group_id;
    
    RAISE NOTICE '✅ Step 2: Test group created with ID: %', test_group_id;
    
    -- Step 3: Test the add_user_to_group RPC function
    SELECT public.add_user_to_group(test_group_id, test_user_id) INTO test_result;
    
    RAISE NOTICE '✅ Step 3: add_user_to_group RPC result: %', test_result;
    
    -- Step 4: Verify the results
    -- Check if user was added to group_members
    IF EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE user_id = test_user_id AND group_id = test_group_id
    ) THEN
        RAISE NOTICE '✅ Step 4a: User found in group_members table';
    ELSE
        RAISE NOTICE '❌ Step 4a: User NOT found in group_members table';
    END IF;
    
    -- Check if profiles.group_id was updated (CRITICAL TEST)
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = test_user_id AND group_id = test_group_id
    ) THEN
        RAISE NOTICE '✅ Step 4b: profiles.group_id updated correctly';
    ELSE
        RAISE NOTICE '❌ Step 4b: profiles.group_id NOT updated (CRITICAL ISSUE)';
    END IF;
    
    -- Check if group member count was updated
    IF EXISTS (
        SELECT 1 FROM public.groups 
        WHERE id = test_group_id AND current_members = 1
    ) THEN
        RAISE NOTICE '✅ Step 4c: Group member count updated correctly';
    ELSE
        RAISE NOTICE '❌ Step 4c: Group member count NOT updated correctly';
    END IF;
    
    -- Show final state
    RAISE NOTICE '📊 Final State Check:';
    
    -- Profile state
    PERFORM (
        SELECT RAISE(NOTICE, 'Profile: user_id=%, group_id=%, username=%', 
                     user_id, group_id, username)
        FROM public.profiles 
        WHERE user_id = test_user_id
    );
    
    -- Group membership state  
    PERFORM (
        SELECT RAISE(NOTICE, 'Membership: user_id=%, group_id=%, joined_at=%', 
                     user_id, group_id, joined_at)
        FROM public.group_members 
        WHERE user_id = test_user_id
    );
    
    -- Group state
    PERFORM (
        SELECT RAISE(NOTICE, 'Group: id=%, name=%, current_members=%', 
                     id, name, current_members)
        FROM public.groups 
        WHERE id = test_group_id
    );
    
END $$;

-- 5. Summary query to show consistency
SELECT 
    p.user_id,
    p.username,
    p.group_id as profile_group_id,
    gm.group_id as membership_group_id,
    g.name as group_name,
    g.current_members,
    CASE 
        WHEN p.group_id = gm.group_id THEN '✅ Consistent'
        WHEN p.group_id IS NULL AND gm.group_id IS NOT NULL THEN '❌ Profile missing group_id'
        WHEN p.group_id IS NOT NULL AND gm.group_id IS NULL THEN '❌ Membership missing'
        ELSE '❌ Inconsistent'
    END as status
FROM public.profiles p
LEFT JOIN public.group_members gm ON p.user_id = gm.user_id
LEFT JOIN public.groups g ON COALESCE(p.group_id, gm.group_id) = g.id
WHERE p.username = 'test-user-123'
ORDER BY p.created_at DESC;

-- 6. Test remove_user_from_group function
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    test_group_id UUID;
    remove_result JSONB;
BEGIN
    -- Get the test group ID
    SELECT id INTO test_group_id 
    FROM public.groups 
    WHERE name LIKE 'test-group-%' 
    LIMIT 1;
    
    IF test_group_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing remove_user_from_group for user: %', test_user_id;
        
        -- Test the remove function
        SELECT public.remove_user_from_group(test_group_id, test_user_id) INTO remove_result;
        
        RAISE NOTICE '✅ remove_user_from_group result: %', remove_result;
        
        -- Verify removal
        IF NOT EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE user_id = test_user_id AND group_id = test_group_id
        ) THEN
            RAISE NOTICE '✅ User removed from group_members';
        ELSE
            RAISE NOTICE '❌ User still in group_members';
        END IF;
        
        -- Check if profiles.group_id was cleared
        IF EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = test_user_id AND group_id IS NULL
        ) THEN
            RAISE NOTICE '✅ profiles.group_id cleared correctly';
        ELSE
            RAISE NOTICE '❌ profiles.group_id NOT cleared';
        END IF;
    END IF;
END $$;

-- 7. Clean up test data
DELETE FROM public.group_members WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.groups WHERE name LIKE 'test-group-%';

-- Final message
SELECT '🎉 Test completed! Check the NOTICES above for results.' as test_status;