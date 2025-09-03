-- SIMPLE DIAGNOSTIC: Check current state of groups and users
-- No complex CTEs, no ambiguous columns, just basic info

-- 1. Check if the RPC function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'add_user_to_group';

-- 2. Check current groups and their member counts
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.current_members,
  g.max_members,
  COUNT(gm.id) as actual_member_count
FROM public.groups g
LEFT JOIN public.group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name, g.current_members, g.max_members
ORDER BY g.created_at DESC
LIMIT 10;

-- 3. Check recent profiles and their group assignments
SELECT 
  p.user_id,
  p.username,
  p.group_id,
  p.created_at,
  u.email,
  u.email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Check recent group_members entries
SELECT 
  gm.group_id,
  gm.user_id,
  gm.joined_at,
  g.name as group_name,
  p.username
FROM public.group_members gm
LEFT JOIN public.groups g ON gm.group_id = g.id
LEFT JOIN public.profiles p ON gm.user_id = p.user_id
ORDER BY gm.joined_at DESC
LIMIT 10;

-- 5. Count total records
SELECT 
  'Summary' as info,
  COUNT(*) as total_groups,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.group_members) as total_group_members
FROM public.groups;


