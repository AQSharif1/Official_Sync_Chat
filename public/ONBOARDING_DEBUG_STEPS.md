# 🔍 **ONBOARDING DEBUG STEPS**

## 🚨 **IMMEDIATE ACTIONS NEEDED:**

### **1. Apply Database Fix First:**
```sql
-- Run FIX_GROUP_ASSIGNMENT_RPC.sql in Supabase SQL Editor
-- This fixes the missing profiles.group_id update
```

### **2. Check Database State:**
```sql
-- Run DATABASE_INSPECTION.sql in Supabase SQL Editor  
-- This shows current groups, members, and data consistency
```

### **3. Test With Enhanced Logging:**
1. Open browser console (F12)
2. Try creating a new user
3. Complete onboarding
4. Look for detailed error messages in console

---

## 🔍 **DEBUGGING CHECKLIST:**

### **Profile Creation Issues:**
- [ ] Check if `profiles` table exists and has correct schema
- [ ] Verify RLS policies allow INSERT on `profiles` for authenticated users
- [ ] Check if `username` field has unique constraints causing conflicts

### **Group Assignment Issues:**
- [ ] Verify `add_user_to_group` RPC function exists and works
- [ ] Check if RLS policies allow INSERT on `groups` and `group_members`
- [ ] Ensure `profiles.group_id` column exists

### **Console Log Analysis:**
Look for these specific error patterns:

**Profile Creation Errors:**
```
❌ Profile creation error details: { code: "...", message: "..." }
```

**Group Assignment Errors:**
```
❌ RPC error adding user to group: { error: "...", code: "..." }
❌ Group creation failed: { error: "..." }
```

**Network/Auth Errors:**
```
❌ No user ID available
❌ Invalid user ID format
```

---

## 🛠 **COMMON ISSUES & FIXES:**

### **Issue 1: RLS Policy Blocking Profile Creation**
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Add missing INSERT policy if needed
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### **Issue 2: Username Conflict**
```sql
-- Check for duplicate usernames
SELECT username, COUNT(*) 
FROM public.profiles 
GROUP BY username 
HAVING COUNT(*) > 1;
```

### **Issue 3: Missing RPC Function**
```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'add_user_to_group' AND routine_schema = 'public';
```

### **Issue 4: Group Creation RLS Block**
```sql
-- Check groups policies
SELECT * FROM pg_policies WHERE tablename = 'groups';

-- Add missing INSERT policy if needed
CREATE POLICY "Authenticated users can create groups" ON public.groups
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

---

## 🧪 **STEP-BY-STEP TEST:**

### **Test 1: Manual Profile Creation**
```sql
-- Try creating profile manually
INSERT INTO public.profiles (user_id, username, genres, personality, habits)
VALUES (auth.uid(), 'test-user-123', '{"rock"}', '{"creative"}', '{"music"}');
```

### **Test 2: Manual Group Creation**
```sql
-- Try creating group manually
INSERT INTO public.groups (name, vibe_label, current_members, max_members, is_private, lifecycle_stage)
VALUES ('test-group', 'Test Vibes', 0, 10, false, 'active');
```

### **Test 3: Manual Group Assignment**
```sql
-- Try calling RPC function manually
SELECT public.add_user_to_group(
  (SELECT id FROM public.groups LIMIT 1),
  auth.uid()
);
```

---

## 📊 **EXPECTED RESULTS:**

### **Successful Onboarding Console Logs:**
```
🔄 Starting profile creation for user: [uuid]
📝 Inserting profile data: {...}
✅ Profile created/updated successfully
🎯 Starting group assignment process...
✅ Group created successfully: {...}
✅ Successfully joined newly created group: [name]
```

### **Profile Should Exist:**
```sql
SELECT user_id, username, group_id FROM public.profiles WHERE user_id = auth.uid();
-- Should return: user_id | username | group_id (not null)
```

### **Group Membership Should Exist:**
```sql
SELECT user_id, group_id FROM public.group_members WHERE user_id = auth.uid();
-- Should return: user_id | group_id
```

---

## 🎯 **NEXT STEPS:**

1. **Apply `FIX_GROUP_ASSIGNMENT_RPC.sql`** - Critical for group assignment
2. **Run `DATABASE_INSPECTION.sql`** - See current database state  
3. **Test with new user** - Check enhanced console logging
4. **Report specific error messages** from console for further debugging

**The enhanced logging will show exactly where the onboarding process is failing!**