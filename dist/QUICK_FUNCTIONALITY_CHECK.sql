-- QUICK FUNCTIONALITY CHECK: See if the fixes are already working
-- Run this to check current state without making changes

-- 1. Check if add_user_to_group function exists and has profile update
SELECT 
    routine_name,
    routine_definition LIKE '%UPDATE public.profiles%' as includes_profile_update,
    routine_definition LIKE '%SET group_id%' as sets_group_id,
    CASE 
        WHEN routine_definition LIKE '%UPDATE public.profiles%' AND routine_definition LIKE '%SET group_id%' 
        THEN '✅ FUNCTION IS FIXED'
        ELSE '❌ FUNCTION NEEDS FIXING'
    END as function_status
FROM information_schema.routines 
WHERE routine_name = 'add_user_to_group' 
AND routine_schema = 'public';

-- 2. Check if profiles table has group_id column
SELECT 
    column_name,
    data_type,
    is_nullable,
    '✅ group_id column exists' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name = 'group_id';

-- 3. Check current RLS policies (should be permissive)
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN cmd = 'ALL' AND qual = 'true' THEN '✅ PERMISSIVE'
        ELSE '⚠️ RESTRICTIVE'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'groups', 'group_members')
ORDER BY tablename, policyname;

-- 4. Check existing data consistency
SELECT 
    'Data consistency check' as check_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END) as profiles_with_groups,
    COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as percentage_assigned
FROM public.profiles;

-- 5. Check for recent group assignments (last hour)
SELECT 
    'Recent activity' as check_type,
    COUNT(*) as recent_profiles,
    COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END) as recent_assignments
FROM public.profiles 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Final recommendation
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'add_user_to_group' 
            AND routine_schema = 'public'
            AND routine_definition LIKE '%UPDATE public.profiles%'
        ) 
        THEN '✅ FUNCTIONALITY APPEARS TO BE WORKING - Try creating a new user account and completing onboarding'
        ELSE '❌ RPC FUNCTION NEEDS TO BE FIXED - Run FIXED_TEST_CYCLE.sql first'
    END as recommendation;