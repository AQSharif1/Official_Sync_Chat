-- =====================================================
-- CRITICAL: Missing INSERT Policies Fix
-- Run this in your Supabase SQL Editor NOW
-- =====================================================

-- 1. ENABLE INSERT for groups table (CRITICAL)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.groups;
CREATE POLICY "Allow insert for authenticated users"
  ON public.groups FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. ENABLE INSERT for group_members table (CRITICAL)  
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.group_members;
CREATE POLICY "Allow insert for authenticated users"
  ON public.group_members FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Grant table permissions (CRITICAL)
GRANT INSERT ON public.groups TO authenticated;
GRANT INSERT ON public.group_members TO authenticated;
GRANT SELECT ON public.groups TO authenticated;
GRANT SELECT ON public.group_members TO authenticated;

-- 4. VERIFICATION - Run this to confirm policies exist
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('groups', 'group_members')
AND cmd = 'INSERT'
ORDER BY tablename;

-- Should return 2 rows showing INSERT policies for both tables