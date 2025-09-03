-- DATABASE INSPECTION: Check current state of groups and members
-- Run this in Supabase SQL Editor to see what's in the database

-- 1. Check how many groups exist
SELECT 
    COUNT(*) as total_groups,
    COUNT(CASE WHEN lifecycle_stage = 'active' THEN 1 END) as active_groups,
    COUNT(CASE WHEN is_private = false THEN 1 END) as public_groups
FROM public.groups;

-- 2. Check group details
SELECT 
    id,
    name,
    vibe_label,
    current_members,
    max_members,
    is_private,
    lifecycle_stage,
    created_at
FROM public.groups 
ORDER BY created_at DESC;

-- 3. Check how many group members exist
SELECT COUNT(*) as total_group_memberships
FROM public.group_members;

-- 4. Check group membership details
SELECT 
    gm.group_id,
    g.name as group_name,
    COUNT(gm.user_id) as actual_member_count,
    g.current_members as stored_member_count,
    g.max_members
FROM public.group_members gm
JOIN public.groups g ON gm.group_id = g.id
GROUP BY gm.group_id, g.name, g.current_members, g.max_members
ORDER BY actual_member_count DESC;

-- 5. Check user profiles and their group assignments
SELECT 
    p.user_id,
    p.username,
    p.group_id as profile_group_id,
    gm.group_id as membership_group_id,
    g.name as group_name,
    CASE 
        WHEN p.group_id IS NOT NULL AND gm.group_id IS NOT NULL THEN 'Consistent'
        WHEN p.group_id IS NULL AND gm.group_id IS NOT NULL THEN 'Profile Missing Group ID'
        WHEN p.group_id IS NOT NULL AND gm.group_id IS NULL THEN 'Membership Missing'
        ELSE 'No Group Assignment'
    END as assignment_status
FROM public.profiles p
LEFT JOIN public.group_members gm ON p.user_id = gm.user_id
LEFT JOIN public.groups g ON COALESCE(p.group_id, gm.group_id) = g.id
ORDER BY p.created_at DESC;

-- 6. Check for orphaned group memberships (members in groups that don't exist)
SELECT 
    gm.user_id,
    gm.group_id,
    'Orphaned Membership' as issue
FROM public.group_members gm
LEFT JOIN public.groups g ON gm.group_id = g.id
WHERE g.id IS NULL;

-- 7. Check for inconsistent member counts
SELECT 
    g.id,
    g.name,
    g.current_members as stored_count,
    COUNT(gm.user_id) as actual_count,
    (g.current_members - COUNT(gm.user_id)) as count_difference
FROM public.groups g
LEFT JOIN public.group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name, g.current_members
HAVING g.current_members != COUNT(gm.user_id);

-- 8. Check recent auth users vs profiles
SELECT 
    COUNT(CASE WHEN au.created_at > NOW() - INTERVAL '1 day' THEN 1 END) as users_last_24h,
    COUNT(CASE WHEN p.created_at > NOW() - INTERVAL '1 day' THEN 1 END) as profiles_last_24h,
    COUNT(CASE WHEN gm.created_at > NOW() - INTERVAL '1 day' THEN 1 END) as memberships_last_24h
FROM auth.users au
FULL OUTER JOIN public.profiles p ON au.id = p.user_id
FULL OUTER JOIN public.group_members gm ON au.id = gm.user_id;

-- 9. Check RLS policies status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members', 'profiles');

-- 10. Check if RPC functions exist
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_name IN ('add_user_to_group', 'remove_user_from_group', 'generate_unique_group_name')
AND routine_schema = 'public';