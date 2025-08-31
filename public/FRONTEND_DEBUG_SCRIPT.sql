-- FRONTEND DEBUG: Check if parameters are being passed correctly
-- This will help identify if the issue is in the frontend or backend

-- Step 1: Check the most recent RPC calls (if logging is enabled)
SELECT 
  'RPC call logging not available in standard Supabase' as note;

-- Step 2: Check if there are any recent group_members entries to see if the function is being called
SELECT 
  COUNT(*) as total_group_members,
  COUNT(CASE WHEN joined_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_members,
  COUNT(CASE WHEN joined_at > NOW() - INTERVAL '1 day' THEN 1 END) as today_members
FROM public.group_members;

-- Step 3: Check if profiles have group_id set
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END) as profiles_with_group,
  COUNT(CASE WHEN group_id IS NULL THEN 1 END) as profiles_without_group
FROM public.profiles;

-- Step 4: Check recent profiles that don't have a group
SELECT 
  p.user_id,
  p.username,
  p.created_at,
  u.email,
  u.email_confirmed_at,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN 'Email not confirmed'
    ELSE 'Email confirmed'
  END as email_status
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.group_id IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- Step 5: Check if groups are being created but users not added
SELECT 
  g.id,
  g.name,
  g.current_members,
  g.created_at,
  COUNT(gm.id) as actual_members
FROM public.groups g
LEFT JOIN public.group_members gm ON g.id = gm.group_id AND gm.expired = false
GROUP BY g.id, g.name, g.current_members, g.created_at
HAVING g.current_members != COUNT(gm.id)
ORDER BY g.created_at DESC
LIMIT 10;

-- Step 6: Create a simple test to verify the function works
-- This will help identify if the issue is in the function itself
DO $$
DECLARE
  test_user_id uuid;
  test_group_id uuid;
  test_result jsonb;
BEGIN
  -- Get a real user
  SELECT id INTO test_user_id FROM auth.users WHERE email_confirmed_at IS NOT NULL LIMIT 1;
  
  -- Get or create a test group
  SELECT id INTO test_group_id FROM public.groups LIMIT 1;
  
  IF test_group_id IS NULL THEN
    -- Create a test group
    INSERT INTO public.groups (name, vibe_label, current_members, max_members, is_private, lifecycle_stage)
    VALUES ('Test Group', 'Test Vibes', 0, 10, false, 'active')
    RETURNING id INTO test_group_id;
  END IF;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No confirmed users found for testing';
    RETURN;
  END IF;
  
  -- Test the function
  SELECT add_user_to_group(test_group_id, test_user_id) INTO test_result;
  
  RAISE NOTICE 'Test result: %', test_result;
  
  -- Check if it worked
  IF test_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ Function test PASSED';
  ELSE
    RAISE NOTICE '❌ Function test FAILED: %', test_result->>'error';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Function test ERROR: %', SQLERRM;
END $$;


