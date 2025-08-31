-- Verify the FOR UPDATE fix worked
-- Run this after applying URGENT_FIX_FOR_UPDATE_REMOVAL.sql

-- Test 1: Check if function exists without FOR UPDATE
SELECT 
    'FUNCTION CHECK' as test_type,
    routine_name,
    routine_definition LIKE '%FOR UPDATE%' as still_has_for_update,
    CASE 
        WHEN routine_definition LIKE '%FOR UPDATE%' THEN '❌ FOR UPDATE STILL PRESENT'
        ELSE '✅ FOR UPDATE REMOVED'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'add_user_to_group';

-- Test 2: Try the function with your specific user
DO $$
DECLARE
    your_user_id UUID := '34dd6bb6-65e5-4d44-8c0c-482f3f9f74dc';
    test_group_id UUID;
    result JSONB;
BEGIN
    -- Create a test group
    INSERT INTO public.groups (name, vibe_label, current_members, max_members, is_private, lifecycle_stage)
    VALUES ('VERIFY-' || extract(epoch from now()), 'Verification Test', 0, 10, false, 'active')
    RETURNING id INTO test_group_id;
    
    RAISE NOTICE '📝 Testing with group: % and user: %', test_group_id, your_user_id;
    
    -- Call the function
    SELECT public.add_user_to_group(test_group_id, your_user_id) INTO result;
    
    RAISE NOTICE '📊 RESULT: %', result;
    
    IF (result->>'success')::boolean THEN
        RAISE NOTICE '🎉 SUCCESS: Function works! User can join groups!';
    ELSE
        RAISE NOTICE '❌ FAILED: %', result->>'error';
    END IF;
    
    -- Cleanup
    DELETE FROM public.group_members WHERE user_id = your_user_id AND group_id = test_group_id;
    UPDATE public.profiles SET group_id = NULL WHERE user_id = your_user_id;
    DELETE FROM public.groups WHERE id = test_group_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;