-- =====================================================
-- CRITICAL RLS SCHEMA ISSUE IDENTIFIED
-- Problem: Chicken-and-egg RLS policies preventing group discovery
-- =====================================================

-- PROBLEM 1: Groups SELECT policy is TOO RESTRICTIVE
-- Current policy (BLOCKING new users):
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
-- This policy PREVENTS new users from seeing ANY groups because they're not members yet!

-- PROBLEM 2: No policy for discovering public groups for joining
-- Users can't find groups to join because they can only see groups they're already in

-- =====================================================
-- SOLUTION: Add group discovery policies
-- =====================================================

-- 1. Allow users to discover public groups for joining (CRITICAL FIX)
CREATE POLICY "Users can discover public groups"
  ON public.groups FOR SELECT 
  USING (is_private = false AND lifecycle_stage = 'active');

-- 2. Keep existing policy for viewing private group details
CREATE POLICY "Users can view groups they belong to" 
  ON public.groups FOR SELECT USING (
    is_private = true AND EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- VERIFICATION: Test if users can now see public groups
-- =====================================================

-- Test query (should return public groups for any authenticated user):
SELECT id, name, vibe_label, current_members, max_members 
FROM public.groups 
WHERE is_private = false AND lifecycle_stage = 'active';

-- =====================================================
-- ADDITIONAL FIXES (if needed)
-- =====================================================

-- Ensure group_members policies allow seeing group membership info
DROP POLICY IF EXISTS "Users can view group member info for discovery" ON public.group_members;
CREATE POLICY "Users can view group member info for discovery"
  ON public.group_members FOR SELECT 
  USING (true); -- Allow reading member counts for capacity checking

-- =====================================================
-- SUMMARY OF THE ISSUE
-- =====================================================

/*
ROOT CAUSE: The original RLS policy on groups table was:

CREATE POLICY "Users can view groups they belong to" 
ON public.groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id AND user_id = auth.uid()
  )
);

This means:
- Users can ONLY see groups they're already members of
- New users can't discover ANY groups to join
- Our findAvailableGroupsWithCapacity() returns empty array
- Group creation becomes the only option, but even that fails without discovery

SOLUTION: 
- Allow discovery of public groups (is_private = false)
- Keep restriction only for private groups
- Allow reading group_members for capacity checking
*/