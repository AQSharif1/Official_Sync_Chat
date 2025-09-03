-- SIMPLE CHECK: Does the UNIQUE constraint on user_id actually exist?

-- Check if there's ANY unique constraint on user_id
SELECT 'CHECKING FOR UNIQUE CONSTRAINT ON user_id' as info;

SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'user_id'
    AND tc.constraint_type = 'UNIQUE';

-- If NO RESULTS above, then the constraint doesn't exist!
-- This is the simple fix - just add the constraint:

-- ADD THE MISSING CONSTRAINT
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Verify it was added
SELECT 'VERIFYING CONSTRAINT WAS ADDED' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'user_id'
    AND tc.constraint_type = 'UNIQUE';
