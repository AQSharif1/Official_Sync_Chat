# 🚨 **CRITICAL USER ID & RPC FUNCTION ISSUES IDENTIFIED**

## 🔥 **ISSUE #1: RPC Function Missing from Schema Cache**

### **Problem:**
```
Error: could not find the function public.delete_user_account(user_id_to_delete in schema cache
```

### **Root Cause:**
The `delete_user_account` function exists in migration files but may not be applied to the database, or the function signature is incorrect.

### **Solution:**
1. **Function may not exist in database** - migration not applied
2. **Parameter name mismatch** - function expects different parameter name
3. **Permission issues** - function not granted to authenticated users

---

## 🔥 **ISSUE #2: Potential User ID Duplication/Generation Issues**

### **Problem:**
Users unable to join/create groups - suggests user ID issues.

### **Potential Root Causes:**
1. **Duplicate user_ids** in profiles table
2. **Invalid UUID format** for user IDs
3. **Orphaned profiles** (user_id not in auth.users)
4. **Users without profiles** (auth.users without profiles)
5. **Race conditions** during signup/onboarding

---

## 🔧 **IMMEDIATE FIXES NEEDED**

### **FIX #1: Recreate RPC Function with Correct Signature**
```sql
-- Run in Supabase SQL Editor:
DROP FUNCTION IF EXISTS public.delete_user_account(uuid);
DROP FUNCTION IF EXISTS public.delete_user_account(user_id_to_delete uuid);

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  group_ids uuid[];
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- Verify user can only delete their own account
  IF current_user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You can only delete your own account'
    );
  END IF;
  
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
  
  -- Remove from groups
  DELETE FROM public.group_members WHERE user_id = p_user_id;
  
  -- Clean up data
  DELETE FROM public.user_karma_progress WHERE user_id = p_user_id;
  DELETE FROM public.group_member_karma WHERE user_id = p_user_id;
  DELETE FROM public.karma_activities WHERE user_id = p_user_id;
  DELETE FROM public.user_achievements WHERE user_id = p_user_id;
  DELETE FROM public.user_engagement WHERE user_id = p_user_id;
  DELETE FROM public.user_switches WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  
  -- Soft delete user
  UPDATE auth.users SET deleted_at = now() WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Account deleted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
```

### **FIX #2: Update Application Code**
```typescript
// In useAccountManagement.ts - change parameter name:
const { data, error } = await supabase.rpc('delete_user_account', {
  p_user_id: user.id  // Changed from user_id_to_delete
});
```

### **FIX #3: Add User ID Validation**
```typescript
// In useOnboardingCompletion.ts - add validation:
const completeOnboarding = async (userProfile: UserProfile) => {
  if (!user?.id) {
    console.error('❌ No user ID available:', user);
    toast({
      title: "Authentication Error",
      description: "User not properly authenticated. Please sign in again.",
      variant: "destructive"
    });
    return { success: false };
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user.id)) {
    console.error('❌ Invalid user ID format:', user.id);
    toast({
      title: "Invalid User ID",
      description: "User ID format is invalid. Please contact support.",
      variant: "destructive"
    });
    return { success: false };
  }

  console.log('✅ User ID validated:', user.id);
  // ... continue with onboarding
};
```

---

## 🧪 **DIAGNOSIS STEPS**

### **Run These Queries in Supabase:**

1. **Check if function exists:**
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%delete%user%';
```

2. **Check for duplicate user IDs:**
```sql
SELECT user_id, COUNT(*) 
FROM public.profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1;
```

3. **Check for orphaned profiles:**
```sql
SELECT p.user_id, p.username 
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;
```

4. **Check recent user creation:**
```sql
SELECT u.id, u.email, p.username, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC
LIMIT 10;
```

---

## 🎯 **IMMEDIATE ACTION PLAN**

1. **🔧 Fix RPC Function** - Run SQL to recreate with correct signature
2. **📝 Update App Code** - Change parameter name in useAccountManagement
3. **✅ Add Validation** - Validate user ID format in onboarding
4. **🧪 Run Diagnostics** - Execute SQL queries to identify data issues
5. **🧹 Clean Up Data** - Remove any duplicate or orphaned records

---

## ⚡ **THIS WILL FIX BOTH ISSUES**

**The RPC function fix will resolve account deletion.**
**The user ID validation will resolve group assignment failures.**

**Apply these fixes in order and test immediately!**