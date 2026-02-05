# Admin Dashboard Fixes

## Issues Fixed

### 1. ✅ Job Detail Fetch Error (View Button)
**Problem**: Clicking "View" on a job in the admin jobs list would fail to load the job details page.

**Root Cause**: The API endpoint `/api/admin/jobs/[id]` was returning raw job data from the database without:
- Joining with the `profiles` table to get `client_name`
- Including all necessary fields like `description`, `duration`, `location`
- Counting job applications

**Solution**: Updated `/app/api/admin/jobs/[id]/route.ts` to:
- Query with proper relations: `profiles (full_name)`
- Include all required fields: description, duration, location, client_id, created_at
- Count job applications and include in response
- Format response to match UI expectations with `client_name` field

**Files Changed**:
- `/app/api/admin/jobs/[id]/route.ts` - Fixed GET endpoint

---

### 2. ✅ Edit Button in Services Not Working
**Problem**: The "Edit" button in the Services Management table was disabled/non-functional.

**Root Cause**: Multiple issues:
1. Edit button had no `onClick` handler
2. API endpoint didn't support PATCH method for updating services
3. Edit UI modal existed but wasn't being triggered

**Solution**: 
- Added `onClick={() => handleEditService(service)}` to the Edit button
- Implemented PATCH method in `/app/api/admin/services/[id]/route.ts` to handle service updates
- Modal and edit state management were already in place

**Files Changed**:
- `/app/dashboard/admin/services/page.tsx` - Added onClick handler (was already modified)
- `/app/api/admin/services/[id]/route.ts` - Added PATCH method

---

## Technical Details

### Job Detail API Response Structure
```typescript
{
  id: string
  title: string
  description: string
  status: string
  budget: number
  duration: string | null
  location: string | null
  created_at: string
  client_id: string
  client_name: string  // ← from profiles join
  applications_count: number
}
```

### Service Edit Flow
1. User clicks "Edit" button on service row
2. `handleEditService(service)` is called
3. Edit modal appears with current service data
4. User modifies name/description
5. Click "Save Changes"
6. PATCH request sent to `/api/admin/services/{id}`
7. Service updated in database
8. UI refreshed with new values

---

## Testing

### Test Job Detail Fetch
1. Navigate to `/dashboard/admin/jobs`
2. Click "View" on any job
3. Should load job details page with:
   - Job title
   - Client name
   - Status, budget, duration, location
   - Description
   - Application count

### Test Service Edit
1. Navigate to `/dashboard/admin/services`
2. Click "Edit" on any service
3. Edit modal should appear
4. Modify name and/or description
5. Click "Save Changes"
6. Service should update in table
7. Refresh page to confirm persistence

---

## API Endpoints Modified

### GET /api/admin/jobs/[id]
- **Before**: Returned raw job with no client name or application count
- **After**: Returns formatted job with client_name and applications_count

### PATCH /api/admin/services/[id]
- **Before**: Method didn't exist
- **After**: Updates service name and description, returns updated record

---

## Status
✅ **Both issues fixed and ready to test**

The application should now:
- Allow admins to view job details by clicking "View"
- Allow admins to edit services by clicking "Edit"
- Persist service changes to the database
- Display all required information on the job detail page
