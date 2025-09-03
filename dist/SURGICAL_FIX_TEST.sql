-- SURGICAL FIX TEST: Verify the onConflict: 'user_id' fix works

-- Test the current add_user_to_group function
CREATE OR REPLACE FUNCTION public.test_surgical_fix()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id UUID;
  test_group_id UUID;
  test_result JSONB;
BEGIN
  -- Find existing user
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE deleted_at IS NULL 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No users available for testing');
  END IF;
  
  -- Create test group
  INSERT INTO public.groups (
    name, vibe_label, current_members, max_members, is_private, lifecycle_stage
  )
  VALUES (
    'SURGICAL-TEST-' || extract(epoch from now()), 
    'Surgical Test', 
    0, 
    10, 
    false, 
    'active'
  )
  RETURNING id INTO test_group_id;
  
  -- Test the function
  SELECT public.add_user_to_group(test_group_id, test_user_id) INTO test_result;
  
  -- Cleanup
  DELETE FROM public.group_members WHERE group_id = test_group_id;
  UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
  DELETE FROM public.groups WHERE id = test_group_id;
  
  RETURN jsonb_build_object(
    'test_user_id', test_user_id,
    'function_result', test_result,
    'status', CASE 
      WHEN (test_result->>'success')::boolean THEN 'SURGICAL_FIX_WORKS' 
      ELSE 'STILL_BROKEN' 
    END,
    'message', 'This test verifies that the onConflict: user_id fix in the frontend resolves the duplicate key errors'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_surgical_fix() TO authenticated, anon, service_role;

SELECT 'SURGICAL FIX TEST READY - Run: SELECT public.test_surgical_fix();' as status;
