# Chat Feature - Quick Reference

## 🚀 Quick Start

### 1. Run Migration
```powershell
# Copy the entire content of:
# scripts/014_create_messages_table.sql

# Paste into Supabase > SQL Editor > Run
```

### 2. Test Locally
```powershell
npm run dev
# Visit http://localhost:3000
```

## 💬 Chat Component Usage

### For Job Applications
```tsx
<JobChat
  jobId={job.id}
  jobApplicationId={userApplication.id}
  recipientId={acceptedApplication.provider_id}
  recipientName={acceptedApplication.provider_name}
  currentUserId={profile.id}
/>
```

### For Bookings
```tsx
<JobChat
  bookingId={booking.id}
  recipientId={provider.id}
  recipientName={provider.full_name}
  currentUserId={profile.id}
  context="booking"
/>
```

## 🔌 API Endpoints

### Fetch Messages
```typescript
// For job applications
GET /api/messages?job_application_id={id}

// For bookings
GET /api/messages?booking_id={id}
```

### Send Message
```typescript
POST /api/messages
Body:
{
  job_id: "uuid" | null,
  job_application_id: "uuid" | null,
  booking_id: "uuid" | null,
  content: "message text",
  recipient_id: "uuid"
}

// Note: Either job_application_id OR booking_id must be provided
```

## 📊 Database Schema

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID (REQUIRED)
  recipient_id UUID (REQUIRED)
  job_id UUID (NULLABLE)
  job_application_id UUID (NULLABLE)
  booking_id UUID (NULLABLE)
  content TEXT (REQUIRED)
  created_at TIMESTAMP
  updated_at TIMESTAMP
  
  -- At least one context required:
  -- (job_id + job_application_id) OR booking_id
)
```

## 🎯 When Chat Appears

### Jobs
```
Chat appears when:
  userApplication.status === 'accepted'
  
Chat disappears when:
  job.status === 'completed'
```

### Bookings
```
Chat appears when:
  booking.status NOT IN ['completed', 'cancelled']
  
Chat disappears when:
  booking.status IN ['completed', 'cancelled']
```

## 🔐 RLS Protection

The following users can message each other:
- Job: Client (poster) ↔ Worker (applicant)
- Booking: Client (booker) ↔ Provider (service owner)

Users can ONLY see messages they sent or received.

## 🐛 Common Issues & Fixes

### Chat not appearing?
```
✓ Check messages table exists in Supabase
✓ Verify application status is 'accepted' (jobs) or booking is active (bookings)
✓ Check browser console for errors
✓ Verify both users are logged in
```

### Messages not updating?
```
✓ Verify Supabase realtime is enabled
✓ Check RLS policies are created
✓ Ensure auth.uid() returns valid UUID
✓ Check subscription channel name matches query
```

### Permission denied errors?
```
✓ Verify both users exist in profiles table
✓ Check job/booking ownership
✓ Verify job_application or booking record exists
✓ Review RLS policy logic in migration
```

## 📱 Mobile Responsiveness

The chat component is fully responsive:
```css
/* On mobile, chat takes full width */
/* On desktop, max-width 7xl with padding */
```

## ⚡ Performance Tips

1. **Limit message fetching**: API orders by created_at DESC
2. **Subscription efficiency**: Uses per-context channels
3. **Indexes**: All lookup fields are indexed
4. **Query optimization**: Only selects needed columns

## 🔄 Real-time Flow

```
User A sends message
  ↓
POST /api/messages
  ↓
Supabase INSERT trigger
  ↓
postgres_changes event fires
  ↓
User B subscription receives INSERT
  ↓
Real-time message appears
```

## 📚 Key Files Reference

| Purpose | File | Lines |
|---------|------|-------|
| Database | `scripts/014_create_messages_table.sql` | 1-88 |
| API GET | `app/api/messages/route.ts` | 1-48 |
| API POST | `app/api/messages/route.ts` | 50-118 |
| Component | `components/ui/job-chat.tsx` | 1-210 |
| Job Integration | `app/jobs/[id]/page.tsx` | Chat section |
| Client Dashboard | `app/dashboard/client/page.tsx` | Chat section |
| Booking Integration | `app/bookings/page.tsx` | Full file |

## 🎓 Learning Resources

- Supabase Realtime: https://supabase.com/docs/guides/realtime
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- Next.js Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- TypeScript Interfaces: https://www.typescriptlang.org/docs/handbook/2/objects.html

## ✨ Features Implemented

✅ Real-time messaging with Supabase subscriptions
✅ Row-level security for user privacy
✅ Dual-context support (jobs and bookings)
✅ Responsive UI component
✅ Error handling and user feedback
✅ Loading and empty states
✅ Auto-scrolling chat window
✅ User avatars and timestamps
✅ Mobile-friendly design
✅ TypeScript type safety

## 🚀 Next Steps

1. ✓ Review the code changes
2. ✓ Run the migration in Supabase
3. ✓ Test locally with `npm run dev`
4. ✓ Follow testing checklist in CHAT_FEATURE_GUIDE.md
5. ✓ Deploy to production

---

**Questions?** Refer to CHAT_FEATURE_GUIDE.md for detailed documentation or IMPLEMENTATION_SUMMARY.md for technical details.
