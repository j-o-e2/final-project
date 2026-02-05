# Contact Reveal Updates for Bookings & Jobs

## Summary
Implement automatic contact revelation for all relationships (bookings and job applications) after approval/acceptance, showing all contact fields: email, phone, location.

## Status

### ✅ COMPLETED - Worker Dashboard (`app/dashboard/worker/page.tsx`)

1. **Line 515-527**: Updated bookings fetch query
   - Added `phone, location,` to the `profiles:client_id` select
   ```sql
   profiles:client_id (
     id,
     full_name,
     avatar_url,
     email, phone, location,
     profile_tier
   )
   ```

2. **Lines 71-83**: Updated `Booking` interface
   - Added `phone?: string` and `location?: string` to `profiles` object
   ```typescript
   profiles: {
     full_name: string
     avatar_url: string | null
     email: string
     phone?: string
     location?: string
     profile_tier?: string
   }
   ```

3. **STILL TODO - Lines 1168-1172**: Update JSX rendering
   - CURRENT:
   ```tsx
   <p className="font-medium text-foreground">{booking.profiles.full_name}</p>
   <p className="text-xs text-muted-foreground">{booking.profiles.email}</p>
   ```
   - REPLACE WITH:
   ```tsx
   <p className="font-medium text-foreground">{booking.profiles.full_name}</p>
   {booking.profiles.email && (
     <p className="text-xs text-muted-foreground">{booking.profiles.email}</p>
   )}
   {booking.profiles.phone && (
     <p className="text-xs text-muted-foreground">{booking.profiles.phone}</p>
   )}
   {booking.profiles.location && (
     <p className="text-xs text-muted-foreground flex items-center gap-1">
       <MapPin className="w-3 h-3" />
       {booking.profiles.location}
     </p>
   )}
   ```

### ⏳ TODO - Client Dashboard (`app/dashboard/client/page.tsx`)

1. **Update bookings fetch query (around line 258-265)**
   - Add provider contact fields to services select
   ```sql
   .select('*, services(*, profiles(id, full_name, avatar_url, email, phone, location, profile_tier))')
   ```

2. **Update Booking interface**
   - Add fields to services.profiles:
   ```typescript
   email: string
   phone?: string
   location?: string
   profile_tier?: string
   ```

3. **Update JSX rendering (around line 710-720)**
   - Show provider contact details when booking.status === 'approved'
   - Similar pattern to worker dashboard, showing email, phone, location

### ⏳ TODO - Jobs Page (`app/jobs/[id]/page.tsx`)

1. **Update job applications display**
   - Show applicant contact details (email, phone, location) when status === 'accepted'
   - Add MapPin import if not present
   - Make applicant cards clickable to `/profile/{applicant_id}`

2. **Update Application fetch (if needed)**
   - Ensure profiles are fetched with email, phone, location fields

### ⏳ TODO - Job Details Display

1. **Client Dashboard Jobs Section** (`app/dashboard/client/page.tsx`)
   - Show applicant contact details in job application cards
   - Add clickable navigation to applicant profiles

## Database Migration Status
✅ **Already Applied**: `scripts/014_profiles_contact_reveal_rls.sql`
- RLS policy auto-reveals profiles after acceptance/approval
- No additional migration needed

## Testing Checklist
- [ ] Worker can see client's email, phone, location in bookings after approval
- [ ] Client can see provider's email, phone, location in bookings after approval
- [ ] Client can see job applicant details after application is accepted
- [ ] Click on avatar/name navigates to full profile detail page
- [ ] Contacts hidden before approval/acceptance
- [ ] MapPin icon displays correctly with location
