-- =====================================================
-- RLS MIGRATION: Fix Missing INSERT Policies
-- Project: lfxoglqpeburasszxovj
-- Purpose: Enable group creation and joining for authenticated users
-- =====================================================

-- STEP 1: Add missing INSERT policies for groups table
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.groups;
CREATE POLICY "Allow insert for authenticated users"
  ON public.groups FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 2: Add missing INSERT policies for group_members table  
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.group_members;
CREATE POLICY "Allow insert for authenticated users"
  ON public.group_members FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 3: Add UPDATE policies for group lifecycle management
DROP POLICY IF EXISTS "Users can update groups they created" ON public.groups;
CREATE POLICY "Users can update groups they created"
  ON public.groups FOR UPDATE 
  USING (created_by_user_id = auth.uid());

-- STEP 4: Add public group viewing for matchmaking
DROP POLICY IF EXISTS "Users can view public groups for matching" ON public.groups;
CREATE POLICY "Users can view public groups for matching"
  ON public.groups FOR SELECT 
  USING (is_private = false AND lifecycle_stage = 'active');

-- STEP 5: Ensure required table columns exist
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS vibe_label TEXT DEFAULT 'General Chat',
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- STEP 6: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_groups_lifecycle_stage ON public.groups(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_groups_is_private ON public.groups(is_private);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- STEP 7: Grant necessary table permissions
GRANT INSERT ON public.groups TO authenticated;
GRANT INSERT ON public.group_members TO authenticated;
GRANT SELECT ON public.groups TO authenticated;
GRANT SELECT ON public.group_members TO authenticated;
GRANT UPDATE ON public.groups TO authenticated;

-- STEP 8: Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (run after migration)
-- =====================================================

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename IN ('groups', 'group_members')
AND cmd = 'INSERT'
AND policyname = 'Allow insert for authenticated users'
ORDER BY tablename;

-- Should return 2 rows (one for each table)

-- =====================================================
-- SUCCESS! 
-- Your group assignment should now work correctly.
-- =====================================================