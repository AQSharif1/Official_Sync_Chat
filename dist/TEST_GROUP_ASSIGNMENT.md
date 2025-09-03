# 🧪 Group Assignment Testing Guide

## Quick Test Instructions

### 1. **Apply the Database Fix (CRITICAL)**
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the entire contents of `public/ULTIMATE_GROUP_FIX.sql`
4. Run the script
5. Verify it completes without errors

### 2. **Start the Development Server**
```bash
npm run dev
```

### 3. **Test the Complete Flow**

#### **Test 1: New User Registration & Onboarding**
1. Open `http://localhost:5173`
2. Click "Sign Up" 
3. Use a new email address
4. Check your email and click the verification link
5. Complete the onboarding flow:
   - Accept legal terms
   - Select some preferences (genres, personality, habits)
   - Choose a username
   - Click "Complete"
6. **Expected Result:** User should be assigned to a group automatically

#### **Test 2: Debug Panel Testing**
1. In the top-right corner, click the "🧪 Debug" button
2. Go to the "Group Assignment" tab
3. Click "Run Full Test Suite"
4. **Expected Results:**
   - All tests should show ✅ (success) or ⚠️ (warning)
   - No ❌ (error) results
   - Health check should report "All systems healthy"

#### **Test 3: Console Validation**
1. Open browser developer tools (F12)
2. Go to the Console tab
3. Paste and run this command:
```javascript
// Quick validation
fetch('/src/utils/validateGroupAssignment.ts').then(response => 
  response.text().then(code => {
    eval(code.replace(/import.*from.*$/gm, ''));
    quickValidation();
  })
);
```

### 4. **Manual Database Verification**

In your Supabase SQL Editor, run these queries:

```sql
-- Check if user was assigned to a group
SELECT 
  p.username,
  p.group_id,
  g.name as group_name,
  gm.joined_at
FROM profiles p
LEFT JOIN groups g ON p.group_id = g.id
LEFT JOIN group_members gm ON p.user_id = gm.user_id
WHERE p.username LIKE 'testuser%' OR p.username LIKE 'User%'
ORDER BY p.created_at DESC
LIMIT 5;

-- Check group assignments
SELECT 
  g.name,
  g.current_members,
  g.max_members,
  COUNT(gm.user_id) as actual_members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.lifecycle_stage = 'active'
GROUP BY g.id, g.name, g.current_members, g.max_members
ORDER BY g.created_at DESC;

-- Test the RPC function directly
SELECT public.test_group_assignment_fix();
```

## 🚨 Troubleshooting

### **Issue: "Function does not exist" Error**
**Solution:** Run the `ULTIMATE_GROUP_FIX.sql` script in Supabase

### **Issue: User not assigned to group**
**Checks:**
1. Verify email is confirmed
2. Check browser console for errors
3. Run the debug panel tests
4. Check if RPC function completed successfully

### **Issue: Null group_id in profiles**
**Solutions:**
1. The enhanced RPC function should prevent this
2. Manual fix: Update the profile directly
```sql
-- Get the user's group from group_members
UPDATE profiles 
SET group_id = (
  SELECT group_id 
  FROM group_members 
  WHERE group_members.user_id = profiles.user_id
)
WHERE group_id IS NULL;
```

### **Issue: Debug panel shows errors**
**Solutions:**
1. Check the specific error messages
2. Verify Supabase connection
3. Ensure all required tables exist
4. Re-run the database fix script

## 📊 Success Indicators

✅ **Onboarding Completes Successfully**
- User completes all onboarding steps
- Success toast appears
- Page refreshes automatically

✅ **Group Assignment Works**
- User has a `group_id` in their profile
- User appears in `group_members` table
- Group `current_members` count is updated

✅ **Chat Access**
- User can access group chat
- Group name and member count display correctly
- Messages can be sent/received

✅ **Debug Tests Pass**
- All health checks show green
- RPC function test succeeds
- Database connectivity confirmed

## 🔧 Advanced Testing

### **Load Testing (Optional)**
Create multiple test accounts rapidly to test:
- Concurrent group assignments
- Group capacity limits
- Performance under load

### **Edge Case Testing**
- Very long usernames
- Special characters in preferences
- Network interruption during onboarding
- Database timeout scenarios

### **Data Consistency Checks**
```sql
-- Find inconsistencies
SELECT 
  'Profile group_id mismatch' as issue,
  COUNT(*) as count
FROM profiles p
LEFT JOIN group_members gm ON p.user_id = gm.user_id AND p.group_id = gm.group_id
WHERE p.group_id IS NOT NULL AND gm.group_id IS NULL

UNION ALL

SELECT 
  'Group count mismatch' as issue,
  COUNT(*) as count
FROM groups g
WHERE g.current_members != (
  SELECT COUNT(*) 
  FROM group_members gm 
  WHERE gm.group_id = g.id
);
```

## 📈 Performance Monitoring

Monitor these metrics during testing:
- Group assignment time (should be < 5 seconds)
- Success rate (should be > 95%)
- Database query performance
- User experience smoothness

---

**If all tests pass, your group assignment system is working perfectly! 🎉**
