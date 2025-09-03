-- Test authentication and group assignment
-- Run this to see what's actually happening

-- Step 1: Check current users in auth.users
SELECT 
    'AUTH USERS' as table_name,
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '❌ NOT CONFIRMED'
        ELSE '✅ CONFIRMED'
    END as email_status
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Check profiles table
SELECT 
    'PROFILES' as table_name,
    user_id,
    username,
    group_id,
    CASE 
        WHEN group_id IS NULL THEN '❌ NO GROUP'
        ELSE '✅ HAS GROUP'
    END as group_status,
    created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Check groups table
SELECT 
    'GROUPS' as table_name,
    id,
    name,
    current_members,
    max_members,
    lifecycle_stage,
    created_at
FROM public.groups 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 4: Check group_members table
SELECT 
    'GROUP MEMBERS' as table_name,
    gm.group_id,
    gm.user_id,
    g.name as group_name,
    p.username,
    gm.joined_at
FROM public.group_members gm
LEFT JOIN public.groups g ON gm.group_id = g.id
LEFT JOIN public.profiles p ON gm.user_id = p.user_id
ORDER BY gm.joined_at DESC 
LIMIT 5;

-- Step 5: Test the RPC function with the most recent user
DO $$
DECLARE
    test_user_id UUID;
    test_group_id UUID;
    test_result JSONB;
    user_email TEXT;
    user_confirmed_at TIMESTAMPTZ;
BEGIN
    -- Get the most recent user
    SELECT id, email, email_confirmed_at 
    INTO test_user_id, user_email, user_confirmed_at
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE '🔍 Testing with user: % (email: %)', test_user_id, user_email;
        
        IF user_confirmed_at IS NULL THEN
            RAISE NOTICE '⚠️  WARNING: User email not confirmed - this might cause issues';
        ELSE
            RAISE NOTICE '✅ User email confirmed at: %', user_confirmed_at;
        END IF;
        
        -- Create a test group
        INSERT INTO public.groups (name, vibe_label, current_members, max_members, is_private, lifecycle_stage)
        VALUES ('TEST-AUTH-' || extract(epoch from now()), 'Auth Test Group', 0, 10, false, 'active')
        RETURNING id INTO test_group_id;
        
        RAISE NOTICE '🏗️  Created test group: %', test_group_id;
        
        -- Test the RPC function
        SELECT public.add_user_to_group(test_group_id, test_user_id) INTO test_result;
        
        RAISE NOTICE '🧪 RPC TEST RESULT: %', test_result;
        
        -- Check if profile was updated
        IF (test_result->>'success')::boolean THEN
            DECLARE
                profile_group_id UUID;
            BEGIN
                SELECT group_id INTO profile_group_id 
                FROM public.profiles 
                WHERE user_id = test_user_id;
                
                IF profile_group_id = test_group_id THEN
                    RAISE NOTICE '🎉 SUCCESS: Profile group_id correctly set to %', profile_group_id;
                ELSE
                    RAISE NOTICE '❌ FAILURE: Profile group_id is % but should be %', profile_group_id, test_group_id;
                END IF;
            END;
        ELSE
            RAISE NOTICE '❌ RPC FAILED: %', test_result->>'error';
        END IF;
        
        -- Cleanup
        DELETE FROM public.group_members WHERE user_id = test_user_id AND group_id = test_group_id;
        UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id AND group_id = test_group_id;
        DELETE FROM public.groups WHERE id = test_group_id;
        
    ELSE
        RAISE NOTICE '❌ No users found in auth.users table';
    END IF;
END $$;