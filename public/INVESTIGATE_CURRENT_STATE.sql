-- INVESTIGATE CURRENT DATABASE STATE
-- Let's see what's actually deployed

-- 1. Check what constraints exist on profiles table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 2. Check the actual table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check what indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'profiles' 
    AND schemaname = 'public';

-- 4. Get the current add_user_to_group function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'add_user_to_group'
    AND routine_schema = 'public';

-- 5. Check if the function exists at all
SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'add_user_to_group'
) as function_exists;
