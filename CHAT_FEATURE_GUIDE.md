# Chat & Review Feature Implementation Guide

## Overview
This feature enables real-time chat between clients and workers/service providers for:
- **Jobs**: Chat when a job application is accepted
- **Bookings**: Chat for service bookings when status is pending/confirmed/approved

Both flows allow reviews to be submitted when the job/booking is marked as completed.

## What Was Added

### 1. Database Migration
- **File:** `scripts/014_create_messages_table.sql`
- **Table:** `messages` - stores all messages between users
- **Features:**
  - Supports both job-based AND booking-based messaging
  - Uses flexible context: either job/job_application OR booking
  - Realtime messaging via Supabase subscriptions
  - Row-level security (RLS) policies to ensure users only see their own messages
  - Foreign keys linking to jobs, job_applications, bookings, and profiles tables
  - CHECK constraint ensures at least one context (job or booking) is provided

### 2. API Routes
- **File:** `app/api/messages/route.ts`
- **Endpoints:**
  - `GET /api/messages?job_application_id=...` - Fetch all messages for a job application
  - `GET /api/messages?booking_id=...` - Fetch all messages for a booking
  - `POST /api/messages` - Send a new message (accepts flexible context)
- **Features:**
  - Server-side authentication via Supabase
  - Real-time message retrieval with RLS enforcement
  - Accepts either job or booking context
  - Validates at least one context is provided

### 3. Chat Component
- **File:** `components/ui/job-chat.tsx`
- **Features:**
  - Real-time message updates using Supabase subscriptions
  - Flexible context (supports both job and booking)
  - Auto-scroll to latest messages
  - Shows sender avatars and timestamps
  - Responsive message bubbles
  - Simple input form to send messages

### 4. Integration Points
- **`app/jobs/[id]/page.tsx`** - Shows chat when worker views an accepted job application
- **`app/dashboard/client/page.tsx`** - Shows chat when client has an accepted job application
- **`app/bookings/page.tsx`** - Shows chat for active bookings (pending/confirmed/approved status)
- All show chat based on status conditions
- Chat disappears when job/booking is marked as "completed" (allowing reviews instead)

## Setup Instructions

### Step 1: Run the Migration
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `scripts/014_create_messages_table.sql`
4. Paste and run it to create the messages table and RLS policies

### Step 2: Test Locally
```powershell
npm run dev
```

### Step 3: Test the Feature

#### Job Chat Flow
1. **Create a job** as a client
2. **Apply for the job** as a worker (use a different account)
3. **Approve the application** as the client
4. **Start chatting** - Both user and worker should see the chat section
5. **Mark job as completed** - Chat disappears, review section appears
6. **Submit a review** - Use the review button that appears

#### Booking Chat Flow
1. **Create a service listing** as a service provider
2. **Book the service** as a client
3. **View your bookings** - Go to /bookings page
4. **Click "Message Service Provider"** to open the chat
5. **Chat in real-time** with the service provider
6. When booking is marked completed, chat closes

## User Flow

### For Workers (Job Applications)
1. Browse available jobs
2. Apply for a job with cover letter and proposed rate
3. **If application is accepted:** Chat opens automatically
4. Chat with the client to discuss details
5. When job is completed, can submit a review

### For Clients (Job Postings)
1. Post a job
2. Receive applications from workers
3. Approve an application
4. **Chat opens automatically** with the accepted worker
5. Mark job as completed when work is done
6. Submit a review for the worker

### For Clients (Service Bookings)
1. Browse available services
2. Book a service from a provider
3. Go to "My Bookings" page
4. Click "Message Service Provider" to open chat
5. Discuss service details in real-time
6. When booking is completed, can submit a review

## Key Features

✅ **Real-time Messaging** - Messages appear instantly via Supabase subscriptions
✅ **Dual Context Support** - Works for both jobs and bookings
✅ **RLS Protection** - Only involved users (client and provider) can see messages
✅ **Auto-scroll** - Latest messages automatically scroll into view
✅ **User Avatars** - Messages show sender profile pictures
✅ **Timestamps** - Each message shows when it was sent
✅ **Mobile Responsive** - Works on all screen sizes
✅ **Flexible Chat Component** - Single component works for all contexts

## Files Modified/Created

### New Files
- `scripts/014_create_messages_table.sql`
- `app/api/messages/route.ts`
- `components/ui/job-chat.tsx`

### Modified Files
- `app/jobs/[id]/page.tsx` - Added chat import and conditional chat display
- `app/dashboard/client/page.tsx` - Added chat import and integration with job cards
- `app/bookings/page.tsx` - Complete rewrite to support real data fetching and chat integration

## Database Schema

### Messages Table Structure
```sql
- id (UUID, PK)
- sender_id (UUID, FK to profiles)
- recipient_id (UUID, FK to profiles)
- job_id (UUID, FK to jobs, nullable)
- job_application_id (UUID, FK to job_applications, nullable)
- booking_id (UUID, FK to bookings, nullable)
- content (TEXT)
- created_at (timestamp)

Constraints:
- CHECK: At least one context must be provided (job OR booking)
```

### RLS Policies
- **SELECT**: Can view if you're the sender OR recipient, and context validation passes
- **INSERT**: Can insert if you're the sender and context validation passes
- **UPDATE/DELETE**: Can only modify own messages with valid context

## Future Enhancements

Consider adding:
- Typing indicators
- Message read receipts
- File/image uploads in chat
- Chat history search
- Message reactions/emojis
- Automatic notifications when new messages arrive
- Notification badge count on bookings page

## Troubleshooting

**No chat appears?**
- Ensure the messages table was created by checking Supabase dashboard
- For jobs: Verify the application status is "accepted"
- For bookings: Verify the booking status is not "completed" or "cancelled"
- Check browser console for errors

**Messages not updating?**
- Ensure Supabase realtime is enabled in your project settings
- Check that RLS policies were created correctly
- Verify both users are authenticated

**RLS permission errors?**
- Make sure both users are part of the context (client and provider/worker)
- Check that the job_application or booking record exists
- Review the RLS policies in the migration file

**Booking chat not showing provider name?**
- Ensure the service has a valid provider_id
- Check that the profile for that provider exists
- Verify the service query in the bookings page is fetching the provider_id correctly
