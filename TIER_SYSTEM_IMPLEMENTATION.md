# Option 1: Tier-Based Profile System - Implementation Guide

## Overview
This implements a tier-based profile upgrade system where users progress through tiers (Basic → Verified → Trusted → Elite → Pro) based on reviews and ratings.

## Database Changes

### 1. Run Migration SQL
Execute this SQL in your Supabase dashboard (SQL Editor):

```sql
-- File: scripts/026_add_profile_tier_system.sql
-- Location: Run in Supabase SQL Editor
```

**What this does:**
- Adds 4 new columns to `profiles` table:
  - `profile_tier` (basic, verified, trusted, elite, pro)
  - `badge_verified` (boolean)
  - `avg_rating` (float 0-5)
  - `total_reviews` (integer)
- Creates `calculate_user_tier()` function that:
  - Calculates average rating from reviews
  - Counts total reviews per user
  - Determines appropriate tier based on criteria
  - Updates profile with new tier and badge status
- Creates automatic trigger that updates tier whenever reviews are added/deleted

### 2. Tier Progression Criteria

| Tier | Requirements | Badge | Benefits |
|------|--------------|-------|----------|
| **Basic** | New account, 0 reviews | None | Can apply for jobs |
| **Verified** | ≥1 review, ≥3.0 rating | ✓ | Priority visibility |
| **Trusted** | ≥10 reviews, ≥4.0 rating | ⭐ | Featured status |
| **Elite** | ≥50 reviews, ≥4.8 rating | 👑 | Direct booking priority |
| **Pro** | ≥50 reviews, ≥4.8 rating, ≥6 months | 🏆 | VIP support |

## API Endpoints

### POST `/api/profile/tier`
**Manually trigger tier calculation:**
```typescript
const response = await fetch('/api/profile/tier', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user-uuid' })
});
const { data } = await response.json();
// Returns: { tier, badge_verified, avg_rating, total_reviews }
```

### GET `/api/profile/tier`
**Fetch current user's tier info:**
```typescript
const response = await fetch('/api/profile/tier');
const { data } = await response.json();
// Returns: { tier, badge_verified, avg_rating, total_reviews, tier_info }
```

## Components

### 1. TierBadge Component (`components/TierBadge.tsx`)
Displays user tier with icon and label.

**Usage:**
```tsx
import { TierBadge } from '@/components/TierBadge'

<TierBadge tier="trusted" size="md" showLabel={true} />
// Output: ⭐ Trusted
```

**Props:**
- `tier`: 'basic' | 'verified' | 'trusted' | 'elite' | 'pro'
- `size`: 'sm' | 'md' | 'lg'
- `showLabel`: boolean
- `className`: string

### 2. TierProgress Component
Shows progress towards next tier with requirements.

**Usage:**
```tsx
<TierProgress 
  tier="verified" 
  avgRating={3.5} 
  totalReviews={5}
/>
```

### 3. TierCard Component
Complete card showing all tier information.

**Usage:**
```tsx
<TierCard
  tier="trusted"
  avgRating={4.2}
  totalReviews={15}
  badgeVerified={true}
  fullName="John Kipchoge"
  email="john@example.com"
/>
```

## Integration Points

### 1. Profile Page (`app/profile/page.tsx`)
- **Updated:** Added tier display section below profile form
- **Shows:** TierCard with current tier, rating, review count, and progress

### 2. Worker Dashboard (`app/dashboard/worker/page.tsx`)
- **Updated:** Profile card in sidebar now shows:
  - Tier badge with icon
  - Quick stats (rating + review count)
  - Clickable edit button

### 3. Review Creation (`app/api/reviews/route.ts`)
- **Updated:** When a review is created, automatically triggers `calculate_user_tier()` for the reviewee
- **Effect:** User tier updates immediately after receiving a new review

## User Flow

```
New User
   ↓
Receives 1st review (3+ stars)
   ↓
Tier: basic → verified ✓
   ↓
Receives 10th review (4+ avg rating)
   ↓
Tier: verified → trusted ⭐
   ↓
Receives 50th review (4.8+ avg rating)
   ↓
Tier: trusted → elite 👑
   ↓
After 6 months as Elite
   ↓
Tier: elite → pro 🏆 (optional subscription tier)
```

## Testing

### 1. Test Tier Calculation
```bash
# In browser console, for a worker who has reviews
const userId = "test-worker-uuid"
const res = await fetch('/api/profile/tier', {
  method: 'POST',
  body: JSON.stringify({ userId })
})
console.log(await res.json())
```

### 2. Test in UI
1. Create a new account or use existing worker
2. Go to `/profile` to see tier card
3. Go to `/dashboard/worker` to see tier in sidebar
4. Create/submit a review for this worker
5. Tier should automatically update

### 3. Manual Database Check
```sql
-- Check user tier stats
SELECT id, full_name, profile_tier, avg_rating, total_reviews, badge_verified
FROM public.profiles
WHERE role = 'worker'
ORDER BY profile_tier DESC, avg_rating DESC;

-- Verify trigger is working
SELECT event_object_table, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_reviewee_tier';
```

## Data Synchronization

### Automatic Updates
- ✅ Tier updates automatically when reviews are created
- ✅ Tier updates automatically when reviews are deleted
- ✅ Average rating recalculated on each review change
- ✅ Badge verification synced with tier

### Manual Update (if needed)
```bash
# Trigger tier recalculation for a specific user
curl -X POST http://localhost:3000/api/profile/tier \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid"}'
```

## Features

### ✨ Automatic Tier Updates
- No manual intervention needed
- Real-time updates via database trigger
- Handles review creation, update, and deletion

### 📊 Progress Tracking
- Visual progress bars showing path to next tier
- Specific requirements listed
- Congratulations message when tier reached

### 🎯 Gamification
- Clear visual hierarchy (basic → pro)
- Emojis and colors for instant recognition
- Motivates users to get more reviews

### 🔒 Transparent Criteria
- Users know exactly what they need
- No hidden requirements
- Display requirements on profile

## Files Modified/Created

### New Files
- `scripts/026_add_profile_tier_system.sql` - Database migration
- `app/api/profile/tier/route.ts` - Tier API endpoints
- `components/TierBadge.tsx` - UI components

### Modified Files
- `app/profile/page.tsx` - Added tier card display
- `app/dashboard/worker/page.tsx` - Added tier badge to profile card
- `app/api/reviews/route.ts` - Added automatic tier calculation trigger

## Deployment

1. **Database Migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy entire `026_add_profile_tier_system.sql` content
   - Execute the SQL
   - Verify by checking profiles table columns

2. **Code Deployment:**
   - All code files are ready
   - No additional npm packages needed
   - Deploy normally via your CI/CD

3. **Verification:**
   - New users should see "Basic" tier on profile
   - After 1 review: "Verified" tier
   - After 10 reviews (4+ rating): "Trusted" tier
   - After 50 reviews (4.8+ rating): "Elite" tier

## Troubleshooting

### Tier not updating
- Check that reviews are being saved correctly
- Verify trigger is active: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trigger_update_reviewee_tier'`
- Manually call POST `/api/profile/tier` to recalculate

### Incorrect tier showing
- Run: `SELECT * FROM public.profiles WHERE id = 'user-uuid'`
- Check avg_rating and total_reviews values
- Verify reviews exist: `SELECT * FROM public.reviews WHERE reviewee_id = 'user-uuid'`

### Badge not showing
- Check `badge_verified` column value in profiles table
- Ensure profile_tier is one of: 'verified', 'trusted', 'elite', 'pro'
- Badge only shows when profile_tier !== 'basic'

## Next Steps

Optional enhancements:
1. Add profile tier filter to search/browse pages
2. Add tier badges to public provider profiles
3. Create admin dashboard to view tier statistics
4. Add tier-specific discounts or features
5. Implement tier-based matching for job recommendations
6. Add email notifications on tier promotion
7. Create tier achievement history/timeline

## Support

For issues or questions:
1. Check database trigger: `SELECT * FROM information_schema.triggers`
2. Verify function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'calculate_user_tier'`
3. Check API response: Browser DevTools → Network tab → POST `/api/profile/tier`
4. Review logs: Check browser console for any errors
