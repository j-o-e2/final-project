# Chat Feature - User & System Flows

## 🎯 Job Chat Flow

### User Flow: Worker Perspective

```
STEP 1: BROWSE JOBS
├─ Worker visits /jobs
├─ Searches/filters jobs
└─ Finds interesting job

STEP 2: APPLY FOR JOB
├─ Clicks "Apply Now" on job card
├─ Fills application form
│  ├─ Cover letter
│  └─ Proposed rate
└─ Submits application

STEP 3: WAIT FOR APPROVAL
├─ Application status: "pending"
├─ Worker can view job but no chat
└─ Waits for client decision

STEP 4: ACCEPTED!
├─ Client approves application
├─ Application status changes to "accepted"
├─ Chat section appears on job page ✅
└─ Worker can now message client

STEP 5: COMMUNICATE
├─ Worker navigates to /jobs/{jobId}
├─ Opens chat section
├─ Sends message to client
├─ Receives real-time replies
└─ Discusses job details

STEP 6: WORK & COMPLETION
├─ Worker completes the job
├─ Client marks job as "completed"
├─ Chat section disappears
└─ Review section appears ✅

STEP 7: SUBMIT REVIEW (Optional)
├─ Worker rates the client (1-5 stars)
├─ Writes review comment
└─ Review is saved
```

### User Flow: Client Perspective

```
STEP 1: POST JOB
├─ Client visits /jobs/post
├─ Fills job details
│  ├─ Title
│  ├─ Description
│  ├─ Budget
│  └─ Required skills
└─ Posts job

STEP 2: RECEIVE APPLICATIONS
├─ Job appears on job listing
├─ Workers apply for the job
├─ Client sees applications in dashboard
└─ Client reviews applications

STEP 3: APPROVE APPLICATION
├─ Client visits /dashboard/client
├─ Finds job with applications
├─ Reviews applicant details
├─ Clicks "Approve Application"
└─ Application status → "accepted"

STEP 4: CHAT OPENS! ✅
├─ Chat section appears in job card
├─ Shows accepted worker name
├─ Client can start messaging immediately
└─ Real-time conversation enabled

STEP 5: COMMUNICATE
├─ Client and worker exchange messages
├─ Discuss job scope/details
├─ Negotiate timeline/budget
└─ Confirm final arrangements

STEP 6: MONITOR WORK
├─ Worker works on job
├─ Client can message anytime
├─ Track progress via chat
└─ Resolve issues in real-time

STEP 7: MARK COMPLETED
├─ Client confirms work is done
├─ Marks job as "completed"
├─ Chat disappears
└─ Review section appears ✅

STEP 8: SUBMIT REVIEW (Optional)
├─ Client rates worker (1-5 stars)
├─ Writes review comment
└─ Review is saved
```

---

## 🛎️ Booking Chat Flow

### User Flow: Client Perspective

```
STEP 1: BROWSE SERVICES
├─ Client visits /services
├─ Searches/filters services
└─ Finds desired service

STEP 2: VIEW SERVICE DETAILS
├─ Clicks on service
├─ Views provider name and profile
├─ Sees price and duration
└─ Reads description

STEP 3: BOOK SERVICE
├─ Clicks "Book Now"
├─ Selects booking date/time
├─ Adds optional notes
│  ├─ Special requests
│  └─ Additional details
└─ Confirms booking

STEP 4: BOOKING CREATED
├─ Booking status: "pending"
├─ Goes to /bookings page
└─ Shows new booking

STEP 5: OPEN CHAT! ✅
├─ Finds the booking in /bookings
├─ Sees "Message Service Provider" button
├─ Clicks to expand chat section
├─ Chat opens with provider
└─ Can now message provider

STEP 6: COMMUNICATE
├─ Client and provider exchange messages
├─ Confirm timing and details
├─ Ask questions
├─ Share location/access info
└─ Make final arrangements

STEP 7: SERVICE DELIVERY
├─ Provider arrives for service
├─ Provides service as booked
├─ Client stays in touch via chat if needed
└─ Service is completed

STEP 8: MARK COMPLETED
├─ Client marks booking as "completed"
├─ Chat section disappears from /bookings
└─ Review section appears ✅

STEP 9: SUBMIT REVIEW (Optional)
├─ Client rates provider (1-5 stars)
├─ Writes review comment
└─ Review is saved
```

### User Flow: Service Provider Perspective

```
STEP 1: CREATE SERVICE
├─ Provider posts service offering
└─ Service appears in /services listing

STEP 2: RECEIVE BOOKING
├─ Client books the service
├─ Provider gets notification (future feature)
└─ Booking appears in provider's view

STEP 3: ACCEPT BOOKING
├─ Provider reviews booking request
├─ Views client's notes/requests
├─ Accepts the booking
└─ Booking status → "confirmed"

STEP 4: CHAT AVAILABLE! ✅
├─ Client can now message provider
├─ Provider can see messages
└─ Real-time conversation enabled

STEP 5: COMMUNICATE
├─ Provider and client message about details
├─ Confirm final timing
├─ Discuss any special requests
└─ Answer client questions

STEP 6: PROVIDE SERVICE
├─ Provider arrives at agreed time
├─ Provides service as described
├─ Can message if running late
└─ Completes service

STEP 7: SERVICE MARKED COMPLETED
├─ Client or provider marks as "completed"
├─ Chat section disappears
└─ Review section appears

STEP 8: RECEIVE REVIEW (Optional)
├─ Client submits review
├─ Provider sees review rating and comment
└─ Review builds provider's reputation
```

---

## 🔄 System Flow: Message Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ USER SENDS MESSAGE                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: JobChat Component                                 │
│ - User types message                                        │
│ - User clicks "Send" button                                 │
│ - Button becomes disabled (disabled state)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ API: POST /api/messages                                     │
│ - Validate: content && recipient_id required               │
│ - Validate: job_application_id OR booking_id required      │
│ - Authenticate: Get user via auth.getUser()               │
│ - Authorize: RLS policy checks permissions                │
│ - Insert: Create message record in database               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE: messages table                                    │
│ - Record inserted with:                                    │
│   - sender_id (from auth)                                  │
│   - recipient_id (from request)                            │
│   - context (job_application_id OR booking_id)            │
│   - content (message text)                                 │
│   - created_at (server timestamp)                          │
│ - RLS policies filter who can insert                       │
│ - CHECK constraint validates context                       │
│ - Triggers fire postgres_changes event                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ SUPABASE REALTIME: postgres_changes event                   │
│ - Event type: INSERT                                        │
│ - Table: messages                                          │
│ - Filter: [job_application_id|booking_id] matches         │
│ - Subscribers are notified (< 500ms)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: Subscriber receives event                         │
│ - Message added to local state                             │
│ - Component re-renders with new message                    │
│ - Auto-scroll moves to latest message                      │
│ - Timestamp displayed                                      │
│ - Sender avatar shown                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ✅ MESSAGE APPEARS ON SCREEN
```

---

## 🔐 Security Flow: RLS Policy Check

```
USER TRIES TO SEND MESSAGE
         │
         ▼
IS USER AUTHENTICATED?
├─ YES → Continue to RLS check
└─ NO → ❌ Return 401 Unauthorized

RLS POLICY: INSERT CHECK
         │
    ┌────┴────┐
    │          │
    ▼          ▼
JOB CONTEXT? BOOKING CONTEXT?
    │           │
    ▼           ▼
    │        IS USER CLIENT
    │        OF THIS BOOKING?
    │        OR PROVIDER
    │        OF SERVICE?
    │           │
    ▼           ▼ (YES)
IS USER CLIENT  ✅ Allow INSERT
OF JOB OR       │
PROVIDER OF     │
JOB APPLICANT?  │
    │           │
    ▼           │
   YES ✅       │
    │◄──────────┘
    │
    ▼
MESSAGE INSERTED

IF NO AT ANY STEP
    │
    ▼
❌ RLS Policy Violation (403 Forbidden)
```

---

## 📊 Chat Visibility Rules

### Job Chat - When Chat Appears?

```
WORKER VIEW:
   userApplication.status === 'accepted' → ✅ SHOW CHAT
   userApplication.status !== 'accepted' → ❌ HIDE CHAT
   job.status === 'completed' → ❌ HIDE CHAT (show review instead)

CLIENT VIEW:
   acceptedApplication exists AND 
   job.status !== 'completed' → ✅ SHOW CHAT
   
   No accepted application → ❌ HIDE CHAT
   job.status === 'completed' → ❌ HIDE CHAT (show review instead)
```

### Booking Chat - When Chat Appears?

```
CLIENT VIEW:
   booking.status NOT IN ['completed', 'cancelled'] → ✅ SHOW CHAT
   
   booking.status IN ['completed', 'cancelled'] → ❌ HIDE CHAT

VISIBILITY STATES:
   ✅ 'pending'     → Show chat
   ✅ 'confirmed'   → Show chat
   ✅ 'approved'    → Show chat
   ❌ 'completed'   → Hide chat (show review instead)
   ❌ 'cancelled'   → Hide chat
```

---

## 📈 State Transitions

### Job Application States
```
┌──────────┐
│ created  │  Application submitted
└─────┬────┘
      │
      ▼
┌──────────┐
│ pending  │  Waiting for client approval
└─────┬────┘
      │
      ├─► ❌ REJECTED (client rejects)
      │
      ▼
┌──────────┐
│ accepted │  ✅ CHAT APPEARS
└─────┬────┘
      │
      ▼
  (Job completion)
      │
      ▼
┌──────────┐
│ completed│  ✅ CHAT DISAPPEARS, REVIEW APPEARS
└──────────┘
```

### Booking States
```
┌──────────┐
│ pending  │  Booking created, waiting for provider
└─────┬────┘
      │
      ├─► ✅ CHAT AVAILABLE
      │
      ▼
┌──────────┐
│confirmed │  Provider accepted
└─────┬────┘
      │
      ├─► ✅ CHAT AVAILABLE
      │
      ▼
┌──────────┐
│ approved │  Service approved
└─────┬────┘
      │
      ├─► ✅ CHAT AVAILABLE
      │
      ├─► ❌ CANCELLED
      │
      ▼
┌──────────┐
│completed │  Service completed
└─────┬────┘
      │
      ├─► ❌ CHAT DISAPPEARS
      ├─► ✅ REVIEW AVAILABLE
      │
      └─► (Optional) Reviewed
```

---

## 🚀 Real-time Data Flow Diagram

```
Worker sends message:
┌───────────┐
│ Worker    │
│ types msg │
└─────┬─────┘
      │
      ▼
┌──────────────────┐
│ POST /api/       │
│ messages         │
└─────┬────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Supabase Backend                     │
│ - Authenticate user                  │
│ - RLS policy check                   │
│ - INSERT into messages table         │
│ - Emit postgres_changes event        │
└─────┬────────────────────────────────┘
      │
      ├─────────────────────────┐
      │                         │
      ▼                         ▼
┌──────────────────┐  ┌──────────────────┐
│ Worker's browser │  │ Client's browser │
│ (Subscriber)     │  │ (Subscriber)     │
│                  │  │                  │
│ Receives INSERT  │  │ Receives INSERT  │
│ event on:        │  │ event on:        │
│ messages:JAX     │  │ messages:JAX     │
│ (or booking_id)  │  │ (or booking_id)  │
└────┬─────────────┘  └────┬─────────────┘
     │                     │
     ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ Update state │     │ Update state │
│ Add message  │     │ Add message  │
│ to messages  │     │ to messages  │
└────┬─────────┘     └────┬─────────┘
     │                     │
     ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ Re-render    │     │ Re-render    │
│ component    │     │ component    │
└────┬─────────┘     └────┬─────────┘
     │                     │
     ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ Show message │     │ Show message │
│ in chat      │     │ in chat      │
│ Auto-scroll  │     │ Auto-scroll  │
└──────────────┘     └──────────────┘
```

---

## ⏱️ Typical Timeline

```
T=0ms:    User clicks "Send" button
T=10ms:   Form validation in browser
T=50ms:   POST request sent to server
T=100ms:  Server authentication check
T=120ms:  RLS policy validation
T=140ms:  Database INSERT
T=200ms:  postgres_changes event fired
T=250ms:  WebSocket delivers to subscriber
T=300ms:  Message appears on recipient's screen ✅
```

---

**Total flow time: ~300ms from click to display** (depending on network)

---

## 🎯 Summary

### Job Chat
- **Visible:** When application "accepted" → When job marked "completed"
- **Participants:** Client (poster) ↔ Worker (applicant)
- **Trigger:** Application approval
- **Lifetime:** From acceptance to job completion

### Booking Chat
- **Visible:** When booking created → When booking completed/cancelled
- **Participants:** Client (booker) ↔ Provider (service owner)
- **Trigger:** Booking creation
- **Lifetime:** From booking to completion

Both flows follow the same real-time architecture using Supabase subscriptions and RLS policies for security.
