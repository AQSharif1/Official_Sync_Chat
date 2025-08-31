# 🧪 **SYSTEMATIC TEST PLAN - STEP BY STEP**

## **PHASE 1: Apply Database Fixes**

### **Step 1: Run SQL Script**
**Copy and paste `APPLY_AND_TEST_CYCLE.sql` into Supabase SQL Editor**
- This will create the proper RPC function with logging
- Set permissive RLS policies for testing
- Run a fake user simulation to verify the fix

**Expected Output:**
```
✅ Step 1: Profile created
✅ Step 2: Group created with ID: [uuid]
✅ Step 3: RPC result: {"success": true, ...}
✅ SUCCESS: profiles.group_id correctly set
✅ SUCCESS: group_members entry exists
🎉 COMPLETE SUCCESS: Fake user onboarding simulation PASSED
```

---

## **PHASE 2: Frontend Testing with Debug Panel**

### **Step 2: Access Debug Panel**
1. **App is running on `localhost:5174`**
2. **Look for "🧪 Debug" button in top-right corner**
3. **Click it to open debug panel**

### **Step 3: Test Database Functions**
1. **Click "Test Database Functions" button**
2. **Watch console output for:**
   ```
   ✅ Database functions accessible
   ✅ Test group created
   ✅ Test profile created
   ✅ RPC function succeeded
   ✅ Profile group_id updated correctly
   🎉 DATABASE TEST PASSED - Functions are working!
   ```

### **Step 4: Test Full Onboarding**
1. **Click "Test Full Onboarding Flow" button**
2. **This creates a real test user and simulates complete onboarding**
3. **Watch for:**
   ```
   ✅ Test user created successfully
   ✅ Profile created during onboarding
   ✅ Group created for assignment
   ✅ User assigned to group successfully
   ✅ ONBOARDING SIMULATION SUCCESSFUL!
   ```

---

## **PHASE 3: Live User Testing**

### **Step 5: Test Real Onboarding**
1. **Open new incognito window**
2. **Go to `localhost:5174`**
3. **Create account:**
   - Email: `livetest${Date.now()}@test.com`
   - Password: `your-test-password-here`
4. **Complete onboarding with any preferences**
5. **Watch browser console for emergency messages:**
   ```
   🚨 EMERGENCY: Starting forced group assignment...
   ✅ EMERGENCY: Group created: {...}
   ✅ EMERGENCY: Profile verified, group_id = [uuid]
   🎉 EMERGENCY: Assignment completed successfully!
   ```

### **Step 6: Test Match Me Function**
1. **If onboarding worked, user should be on home page**
2. **Click "Match Me" button**
3. **Watch console for:**
   ```
   🚨 EMERGENCY MATCH ME: Starting forced group matching...
   ✅ EMERGENCY MATCH: Group created: {...}
   ✅ EMERGENCY MATCH: User added to group successfully
   ```

---

## **PHASE 4: Verification Queries**

### **Step 7: Database Verification**
**Run in Supabase SQL Editor to see actual data:**
```sql
-- Check recent user assignments
SELECT 
    p.username,
    p.group_id as profile_group_id,
    gm.group_id as membership_group_id,
    g.name as group_name,
    CASE 
        WHEN p.group_id = gm.group_id THEN '✅ SUCCESS'
        ELSE '❌ FAILED'
    END as status
FROM public.profiles p
LEFT JOIN public.group_members gm ON p.user_id = gm.user_id
LEFT JOIN public.groups g ON p.group_id = g.id
WHERE p.created_at > NOW() - INTERVAL '1 hour'
ORDER BY p.created_at DESC;
```

**Expected Results:**
- All entries show `status: ✅ SUCCESS`
- `profile_group_id` matches `membership_group_id`
- `group_name` is not null

---

## **🎯 SUCCESS CRITERIA:**

### **✅ Database Tests Pass:**
- SQL simulation shows all green checkmarks
- Debug panel database test succeeds
- Debug panel onboarding test succeeds

### **✅ Live Tests Pass:**
- Real user onboarding completes without errors
- User gets assigned to group (console shows success)
- Match Me button works without errors
- User can access group chat

### **✅ Database Verification:**
- Recent users show consistent group assignments
- profiles.group_id matches group_members.group_id
- No orphaned or missing assignments

---

## **🚨 IF TESTS FAIL:**

### **Immediate Actions:**
1. **Copy exact error message from console**
2. **Screenshot any error toasts**
3. **Run database verification query**
4. **Report specific step that failed**

### **I Will:**
1. **Analyze the exact error**
2. **Fix the specific issue**
3. **Re-run tests until they pass**
4. **Continue iterating until 100% success**

---

## **📋 EXECUTION CHECKLIST:**

- [ ] **Apply APPLY_AND_TEST_CYCLE.sql**
- [ ] **Verify SQL simulation passes**
- [ ] **Test debug panel database functions**
- [ ] **Test debug panel onboarding flow**
- [ ] **Test live user onboarding**
- [ ] **Test Match Me functionality**
- [ ] **Run database verification queries**
- [ ] **Confirm all tests show ✅ SUCCESS**

**START WITH PHASE 1 - Apply the SQL script and report the results!**