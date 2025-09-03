# 🐛 DEBUG: Group Assignment Issues

## 🧪 How to Test Current Implementation

1. **Open Dev Tools** (F12) in browser
2. **Navigate to:** http://localhost:5174
3. **Sign up new user** with unique email
4. **Complete onboarding** with preferences
5. **Check Console** for any error messages
6. **Check Network Tab** for failed API calls

## 🔍 What to Look For

### ✅ **Success Indicators:**
- Console shows: `✅ User added to group: [group-id]`
- No red errors in console
- User redirected to group chat
- Profile shows group_id in database

### ❌ **Failure Indicators:**
- Console errors about group assignment
- Toast error: "Unable to assign you to a group"
- User stuck on onboarding page
- 400/500 errors in Network tab

## 🛠️ **Common Issues & Fixes:**

### Issue: "Group at capacity"
**Fix:** Increase max_members or create more groups

### Issue: "RPC function failed" 
**Fix:** Check Supabase database migration applied

### Issue: "Profile not found"
**Fix:** Ensure user profile created before group assignment

### Issue: Environment variables
**Fix:** Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

## 📊 **Specific Error to Report:**

Please test the flow and report:
1. **Exact error message** from console
2. **Step where it fails** (signup/onboarding/group assignment)
3. **Network response** if API calls fail
4. **Browser console logs**

This will help identify the real issue without breaking working code.