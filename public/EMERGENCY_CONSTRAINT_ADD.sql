-- EMERGENCY CONSTRAINT FIX
-- This will DEFINITELY add the missing constraint

-- First, let's see what constraints exist
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- Add the missing UNIQUE constraint directly
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Verify it was added
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- Show confirmation
SELECT 'UNIQUE CONSTRAINT ADDED TO profiles.user_id' as status;
