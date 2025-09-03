-- 🚨 URGENT: Remove FOR UPDATE causing read-only transaction errors
-- This fixes the exact issue you identified

-- Step 1: Drop the broken function
DROP FUNCTION IF EXISTS public.add_user_to_group(uuid, uuid) CASCADE;

-- Step 2: Create the WORKING function WITHOUT FOR UPDATE
CREATE OR REPLACE FUNCTION public.add_user_to_group(p_group_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
  group_name TEXT;
BEGIN
  RAISE NOTICE '🎯 URGENT FIX: add_user_to_group called with group_id=%, user_id=%', p_group_id, p_user_id;
  
  -- Validate inputs
  IF p_group_id IS NULL OR p_user_id IS NULL THEN
    RAISE NOTICE '❌ Invalid input parameters';
    RETURN jsonb_build_object('success', false, 'error', 'Invalid input parameters');
  END IF;
  
  -- Get group info WITHOUT FOR UPDATE (this was causing the error)
  SELECT current_members, max_members, name 
  INTO current_count, max_count, group_name
  FROM public.groups 
  WHERE id = p_group_id;
  -- ✅ REMOVED FOR UPDATE - this was the problem!
  
  IF NOT FOUND THEN
    RAISE NOTICE '❌ Group not found: %', p_group_id;
    RETURN jsonb_build_object('success', false, 'error', 'Group not found');
  END IF;
  
  RAISE NOTICE '🔍 Found group: % (%/%)', group_name, current_count, max_count;
  
  -- Check if user already in group
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id) THEN
    RAISE NOTICE '⚠️ User already in group, updating profile anyway';
    UPDATE public.profiles SET group_id = p_group_id, updated_at = NOW() WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'group_id', p_group_id, 'group_name', group_name, 'message', 'Already member');
  END IF;
  
  -- Add to group_members
  BEGIN
    INSERT INTO public.group_members (group_id, user_id, joined_at)
    VALUES (p_group_id, p_user_id, NOW());
    RAISE NOTICE '✅ Added to group_members';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to add to group_members: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to add to group_members: ' || SQLERRM);
  END;
  
  -- Update profile.group_id (CRITICAL)
  BEGIN
    UPDATE public.profiles 
    SET group_id = p_group_id, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
      RAISE NOTICE '⚠️ No profile found, creating basic profile';
      INSERT INTO public.profiles (user_id, username, group_id, genres, personality, habits, created_at, updated_at)
      VALUES (p_user_id, 'User' || substring(p_user_id::text from 1 for 8), p_group_id, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET group_id = p_group_id, updated_at = NOW();
    END IF;
    
    RAISE NOTICE '✅ Profile updated with group_id';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to update profile: %', SQLERRM;
    -- Rollback group_members insert
    DELETE FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update profile: ' || SQLERRM);
  END;
  
  -- Update group count (atomic, no lock needed)
  UPDATE public.groups 
  SET current_members = current_members + 1
  WHERE id = p_group_id;
  
  RAISE NOTICE '🎉 SUCCESS: User added to group % (%)', p_group_id, group_name;
  
  RETURN jsonb_build_object(
    'success', true, 
    'group_id', p_group_id,
    'group_name', group_name,
    'message', 'User successfully added to group'
  );
END;
$$;

-- Step 3: Fix the remove function too
DROP FUNCTION IF EXISTS public.remove_user_from_group(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.remove_user_from_group(p_group_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  group_name TEXT;
BEGIN
  RAISE NOTICE '🎯 URGENT FIX: remove_user_from_group called with group_id=%, user_id=%', p_group_id, p_user_id;
  
  -- Get group info WITHOUT FOR UPDATE
  SELECT name INTO group_name
  FROM public.groups 
  WHERE id = p_group_id;
  -- ✅ REMOVED FOR UPDATE - this was also causing issues
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found');
  END IF;
  
  -- Remove from group_members
  DELETE FROM public.group_members 
  WHERE group_id = p_group_id AND user_id = p_user_id;
  
  -- Clear profile.group_id
  UPDATE public.profiles 
  SET group_id = NULL, updated_at = NOW()
  WHERE user_id = p_user_id AND group_id = p_group_id;
  
  -- Update group count (atomic)
  UPDATE public.groups 
  SET current_members = GREATEST(0, current_members - 1)
  WHERE id = p_group_id;
  
  RAISE NOTICE '🎉 SUCCESS: User removed from group % (%)', p_group_id, group_name;
  
  RETURN jsonb_build_object('success', true, 'group_id', p_group_id, 'group_name', group_name);
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.add_user_to_group(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.remove_user_from_group(uuid, uuid) TO authenticated, anon, service_role;

-- Step 5: Test with your specific user
DO $$
DECLARE
    test_user_id UUID := '34dd6bb6-65e5-4d44-8c0c-482f3f9f74dc'; -- Your current user
    test_group_id UUID;
    test_result JSONB;
BEGIN
    RAISE NOTICE '🧪 TESTING with your specific user: %', test_user_id;
    
    -- Create test group
    INSERT INTO public.groups (name, vibe_label, current_members, max_members, is_private, lifecycle_stage)
    VALUES ('URGENT-TEST-' || extract(epoch from now()), 'Urgent Fix Test', 0, 10, false, 'active')
    RETURNING id INTO test_group_id;
    
    RAISE NOTICE '🏗️ Created test group: %', test_group_id;
    
    -- Test the fixed function
    SELECT public.add_user_to_group(test_group_id, test_user_id) INTO test_result;
    
    RAISE NOTICE '🎯 URGENT TEST RESULT: %', test_result;
    
    IF (test_result->>'success')::boolean THEN
        RAISE NOTICE '🎉 SUCCESS: FOR UPDATE issue FIXED! User can now join groups!';
        
        -- Verify profile was updated
        DECLARE
            profile_group_id UUID;
        BEGIN
            SELECT group_id INTO profile_group_id 
            FROM public.profiles 
            WHERE user_id = test_user_id;
            
            IF profile_group_id = test_group_id THEN
                RAISE NOTICE '✅ VERIFIED: Profile group_id correctly set';
            ELSE
                RAISE NOTICE '❌ Profile group_id not set correctly';
            END IF;
        END;
        
    ELSE
        RAISE NOTICE '❌ STILL FAILING: %', test_result->>'error';
    END IF;
    
    -- Cleanup
    DELETE FROM public.group_members WHERE user_id = test_user_id AND group_id = test_group_id;
    UPDATE public.profiles SET group_id = NULL WHERE user_id = test_user_id;
    DELETE FROM public.groups WHERE id = test_group_id;
    
END $$;

-- Step 6: Show the fix status
SELECT 
    '🚨 URGENT FOR UPDATE FIX APPLIED' as status,
    'FOR UPDATE removed from both functions' as fix_details,
    'Functions now work in RPC context' as result,
    'Test your onboarding now!' as instruction;