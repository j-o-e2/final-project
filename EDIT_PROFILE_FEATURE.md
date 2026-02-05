# Edit Profile Feature - Complete Implementation

## Overview
Added a comprehensive edit profile modal with avatar upload capability across all user role dashboards (Worker, Client, Admin, Foreman).

## Components Created/Updated

### 1. **EditProfileModal Component** (`components/EditProfileModal.tsx`)
- **Features:**
  - Profile picture/avatar upload with preview
  - Edit full name, phone, and location
  - Avatar upload to Supabase Storage (`avatars` bucket)
  - Client-side image preview before upload
  - Clear button to remove avatar selection
  - Error handling and loading states
  - Modal dialog with cancel/save buttons

- **Fields:**
  - **Avatar Upload**: Image picker with drag-and-drop (JPG, PNG, GIF)
  - **Full Name**: Text input
  - **Phone**: Text input
  - **Location**: Text input

- **Technical Details:**
  - Uses Next.js Image component for optimized rendering
  - File uploaded to Supabase Storage: `storage/avatars/{userId}/avatar.{ext}`
  - Public URL retrieved after upload
  - Updates profiles table with new avatar_url
  - RLS policies enforce that users can only edit their own profile

## Dashboard Updates

### 2. **Worker Dashboard** (`app/dashboard/worker/page.tsx`)
- Added "Edit Profile" button (User icon) next to Delete Account
- Integrated EditProfileModal at bottom of component
- Modal opens with `setEditProfileOpen` state
- Profile updates reflected in real-time

### 3. **Client Dashboard** (`app/dashboard/client/page.tsx`)
- Replaced inline profile edit link with modal button
- Added "Edit Profile" button (User icon)
- Integrated EditProfileModal component
- Consistent UI with other dashboards

### 4. **Admin Dashboard** (`app/dashboard/admin/page.tsx`)
- Added profile fetch on component load
- Added header controls with "Edit Profile" and "Logout" buttons
- Integrated EditProfileModal
- Admin profile now editable like other roles

### 5. **Foreman Dashboard** (`app/dashboard/foreman/page.tsx`)
- Added "Edit Profile" button (User icon) between Post Job and Logout
- Integrated EditProfileModal
- Consistent with other dashboards

## Database & Storage

### Profiles Table Updates
- Existing `avatar_url` column stores public URL from Supabase Storage
- Foreign key constraints maintained
- RLS policies ensure users can only update their own profile

### Storage Structure
```
Bucket: avatars
├── {user_id}/
│   └── avatar.{extension}
```

## User Flow

1. **User clicks "Edit Profile"** button on any dashboard
2. **Modal opens** showing:
   - Current avatar with upload option
   - Full name field
   - Phone field
   - Location field
3. **User can upload/change avatar**:
   - Click "Choose Photo" to select image
   - Preview updates immediately
   - Click "Clear" to remove selection
4. **User edits text fields** (full_name, phone, location)
5. **User clicks "Save Changes"**:
   - Avatar uploads to Supabase Storage (if selected)
   - Profile data updated in database
   - Modal closes
   - Dashboard profile updated
6. **User can click "Cancel"** to close without saving

## API Endpoints Used

- `supabase.auth.getUser()` - Get authenticated user
- `supabase.from("profiles").update()` - Update profile data
- `supabase.storage.from("avatars").upload()` - Upload avatar image
- `supabase.storage.from("avatars").getPublicUrl()` - Get public URL

## Error Handling

- Authentication check before allowing updates
- Profile update validation
- Avatar upload error handling with user-friendly messages
- All errors displayed in modal with red styling

## RLS Policy Enforcement

The following policies automatically enforce security:

```sql
-- Users can UPDATE their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role (triggers) can update for auto-operations
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role');
```

## UI/UX Features

- **Avatar Preview**: Circular image display (w-24 h-24) with dashed border
- **Loading State**: "Saving..." text during update
- **Responsive**: Mobile-friendly modal with max-width-md
- **Accessibility**: Proper labels, button states, error messages
- **Consistency**: Icon + text buttons, standard card styling

## Testing Checklist

- [ ] Upload new avatar - verify appears in Supabase Storage
- [ ] Edit profile fields - verify data updates in database
- [ ] Clear avatar - verify selection cleared
- [ ] Try with existing avatar - verify replaced
- [ ] Test on all 4 dashboard types (Worker, Client, Admin, Foreman)
- [ ] Verify RLS prevents users from editing other profiles
- [ ] Test error handling with invalid images
- [ ] Verify profile updates persist after page refresh

## Files Modified

1. `components/EditProfileModal.tsx` - Created
2. `app/dashboard/worker/page.tsx` - Added import and modal
3. `app/dashboard/client/page.tsx` - Added import and modal
4. `app/dashboard/admin/page.tsx` - Added import, profile fetch, and modal
5. `app/dashboard/foreman/page.tsx` - Added import and modal

## Next Steps (Optional)

- Add image cropping before upload
- Add avatar URL field for external image links
- Add form validation for phone number format
- Add success toast notification after save
- Add avatar fallback with initials
- Profile picture in navbar/header area
