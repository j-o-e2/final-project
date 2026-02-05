# 🚀 QUICK START: Option 1 Tier System Deploy

## ⚡ 5-Minute Deployment

### Step 1: Run Database Migration (2 minutes)
1. Open Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Copy-paste everything from: `scripts/026_add_profile_tier_system.sql`
4. Click **"Run"** button
5. Wait for ✅ **success message**

```
Expected Output:
✅ Query executed successfully
```

### Step 2: Deploy Code (2 minutes)
Your code changes are in:
- `app/api/profile/tier/route.ts` ← NEW
- `components/TierBadge.tsx` ← NEW
- `app/profile/page.tsx` ← UPDATED
- `app/dashboard/worker/page.tsx` ← UPDATED
- `app/api/reviews/route.ts` ← UPDATED

**Deploy using your normal process:**
- Git push → auto-deploy (Vercel)
- Or manually run: `npm run build && npm start`

### Step 3: Verify Installation (1 minute)
1. Go to `/profile` page in your app
2. **Should see:** Tier card below profile form
3. Go to `/dashboard/worker`
4. **Should see:** Tier badge in profile card sidebar

If you see tier badge → ✅ **Installation successful!**

---

## 🧪 Quick Test

### Test 1: View Your Tier
1. Go to `/profile` page
2. Look for "Basic Tier ⭕" card
3. Should show:
   - Current tier
   - 0.0 rating
   - 0 reviews
   - Requirements to next tier

### Test 2: Trigger Tier Update
1. Log in as different user (or create test worker)
2. Go to job page with existing job
3. Click "Submit Review" button
4. Fill form:
   - Rating: 5 ⭐
   - Comment: "Great work!"
5. Submit

**Expected result:**
- User receives review
- Tier automatically changes to "Verified ✓"
- Badge shows on their profile

### Test 3: Multiple Reviews
Submit 10+ reviews to same worker with 4+ rating:
- After 10 reviews (4.0+ avg): Tier becomes "Trusted ⭐"

---

## 📋 What Each Tier Unlocks

| Tier | Need | Benefits |
|------|------|----------|
| **Basic** | New account | Can apply for jobs |
| **Verified** | 1 review (3+⭐) | ✓ Verified badge |
| **Trusted** | 10 reviews (4+⭐) | ⭐ Featured status |
| **Elite** | 50 reviews (4.8+⭐) | 👑 Priority booking |
| **Pro** | 50 reviews (4.8+⭐) + 6mo | 🏆 VIP support |

---

## 🔍 Where to See Tiers

### User Can See Their Tier:
- ✅ `/profile` page → Tier card section
- ✅ `/dashboard/worker` → Profile sidebar card
- ✅ `GET /api/profile/tier` → API response

### Public Visibility (Optional Future):
- Can add badge to `/provider/[id]` pages
- Can show in worker search results
- Can display in job applications

---

## 📊 Database Check (Optional)

**Verify migration worked:**
```sql
-- Paste in Supabase SQL Editor

-- Check 1: New columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('profile_tier', 'avg_rating', 'total_reviews', 'badge_verified');

-- Check 2: Trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_reviewee_tier';

-- Check 3: Function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'calculate_user_tier';

-- Check 4: View your tier
SELECT id, full_name, profile_tier, avg_rating, total_reviews 
FROM profiles 
LIMIT 5;
```

---

## ⚠️ Common Issues & Fixes

### Issue: "Tier card not showing on /profile"
**Fix:** 
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check console for errors (F12)
4. Verify deployment completed

### Issue: "Migration failed in SQL Editor"
**Fix:**
1. Copy-paste again carefully
2. Check for typos
3. Run one command at a time if needed
4. Check Supabase status page

### Issue: "Reviews not updating tier"
**Fix:**
1. Check browser console (F12) after submitting review
2. Look for: `[Profile Tier] User ... tier updated`
3. If not there, check POST `/api/reviews` response
4. Check that reviewee profile exists in database

### Issue: "Tier shows but says 'Basic' for everyone"
**Fix:**
1. Ensure migration ran (check profiles table has new columns)
2. Verify trigger exists (run database check above)
3. Manually trigger update:
   ```bash
   curl -X POST http://localhost:3000/api/profile/tier \
     -H "Content-Type: application/json" \
     -d '{"userId":"actual-worker-uuid"}'
   ```

---

## 🎯 Next Steps

### Immediately After Deploy:
1. ✅ Test on `/profile` page
2. ✅ Create a review and see tier update
3. ✅ Check worker dashboard sidebar

### Optional Future Enhancements:
1. Show tier on public provider profiles
2. Filter job search by tier
3. Add tier-based discounts
4. Email notifications on tier promotion
5. Admin dashboard showing tier statistics

---

## 📞 Support Reference

**For issues, check these in order:**

1. **Database columns exist:**
   ```sql
   DESCRIBE profiles;
   -- Should show: profile_tier, badge_verified, avg_rating, total_reviews
   ```

2. **Trigger is active:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_update_reviewee_tier';
   ```

3. **API response:**
   - Go to `/profile` page
   - Open DevTools (F12)
   - Network tab
   - Look for requests to `/api/profile/tier`
   - Check response JSON

4. **Browser console:**
   - Should see no red errors
   - Should see tier update messages after review creation

---

## ✅ Success Checklist

- [ ] SQL migration executed in Supabase
- [ ] No errors in SQL Editor
- [ ] Code deployed to your server
- [ ] Can see tier badge on `/profile`
- [ ] Can see tier in worker dashboard sidebar
- [ ] Submitted review updated user's tier
- [ ] Browser console shows `[Profile Tier]` log messages
- [ ] Tier value matches review count/rating

**When all checked → Tier system is live! 🎉**

---

## 📚 Full Documentation

For complete details, see:
- `TIER_SYSTEM_IMPLEMENTATION.md` - Full guide
- `TIER_SYSTEM_SUMMARY.md` - Complete summary
- `scripts/026_add_profile_tier_system.sql` - SQL code with comments

---

**Deploy Duration:** ~5-10 minutes total  
**Complexity:** Low (SQL + code copy)  
**Risk:** None (additive only, no deletes)  
**Rollback:** Simple (if needed, ignore tier fields)
