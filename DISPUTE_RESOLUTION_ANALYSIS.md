# Dispute Resolution System - Comprehensive Analysis & Implementation Guide

## Executive Summary

The LocalFix Kenya marketplace needs a robust dispute resolution system to handle conflicts between clients and service providers. This system will manage complaints, mediate disputes, track resolutions, and maintain user reputation scores.

---

## 1. Current State Analysis

### Existing Infrastructure (From Admin Reports Page)
- **Reports Table Structure:**
  - `id` - Report identifier
  - `type` - Type of report
  - `reporter_id` - Who filed the report
  - `reporter_name` - Reporter's name
  - `target_id` - User being reported
  - `target_name` - Reported user's name
  - `reason` - Report reason
  - `description` - Detailed description
  - `status` - Report status (open, investigating, resolved)
  - `created_at` - Timestamp

### Current Admin Capabilities
- View reports and complaints
- Filter by status and search
- Mark reports as resolved
- Delete reports
- View statistics (open, investigating, resolved counts)

### Gaps Identified
1. No link between disputes and actual transactions (jobs/bookings)
2. No evidence/documentation system
3. No mediation or negotiation workflow
4. No appeal process
5. No user reputation tracking
6. No financial reconciliation (refunds, penalties)
7. No resolution tracking
8. No analytics on dispute patterns

---

## 2. Dispute Resolution System Architecture

### Core Components

#### A. **Disputes** (Main transaction)
- Links to both jobs and service bookings
- Tracks complainant and respondent
- Categories: Quality, Payment, Deadline, Communication, Safety
- Severity levels: Low, Medium, High, Critical
- Status workflow: Open → Assigned → Under Review → Negotiation → Escalated → Resolved → Closed

#### B. **Evidence Management**
- Store complaint evidence (documents, photos, messages, invoices)
- Track what each party submitted
- Support multiple file types
- Maintain timestamps for context

#### C. **Communication Thread**
- Comments between disputing parties
- Settlement offers and counter-offers
- Admin notes and decisions
- Complete audit trail

#### D. **Resolution Process**
- Resolution types: Mutual agreement, Mediator decision, System refund, Admin decision
- Winning party determination
- Refund processing and tracking
- Appeal handling with deadlines

#### E. **User Reputation System**
- Track dispute history per user
- Calculate win rates and settlement rates
- Risk scoring (0-100 reputation)
- Risk levels: Low, Medium, High, Critical
- Account suspension capabilities

---

## 3. Database Schema (8 Core Tables)

### Table 1: `disputes`
**Purpose:** Main dispute record
```sql
- id (UUID, PK)
- job_id (FK to jobs) - NULL if booking dispute
- booking_id (FK to bookings) - NULL if job dispute
- complainant_id (FK to profiles)
- respondent_id (FK to profiles)
- title (VARCHAR)
- description (TEXT)
- category (quality_of_work, payment, deadline, communication, safety, other)
- severity (low, medium, high, critical)
- status (open → resolved → closed)
- assigned_admin_id (FK to profiles)
- disputed_amount (DECIMAL)
- created_at, updated_at, resolved_at (TIMESTAMPS)
- priority (1-10 scale)
- estimated_resolution_date (DATE)
```

**Key Constraints:**
- At least one of job_id OR booking_id must exist
- Amount must be positive
- Status progression: open → assigned_mediator → under_review → negotiation → escalated → resolved → closed

---

### Table 2: `dispute_evidence`
**Purpose:** Store supporting documents and media
```sql
- id (UUID, PK)
- dispute_id (FK)
- type (message, invoice, photo, video, document, screenshot, audio)
- title, description
- file_url, file_size, file_type (for media)
- content (TEXT for written evidence)
- submitted_by (FK to profiles)
- created_at
```

**Use Cases:**
- Invoice/payment screenshots
- Photos of work quality issues
- Message conversations
- Communication logs
- Work samples

---

### Table 3: `dispute_communications`
**Purpose:** Chat/negotiation thread
```sql
- id (UUID, PK)
- dispute_id (FK)
- sender_id (FK to profiles)
- message_type (comment, offer, counter_offer, admin_note)
- content (TEXT)
- offered_amount (DECIMAL, for settlement offers)
- offer_status (pending, accepted, rejected, counter)
- created_at, updated_at
```

**Workflow:**
1. Parties exchange comments
2. One party makes a settlement offer
3. Other party can accept, reject, or counter
4. Admin adds notes or mediates
5. Negotiation continues until resolution

---

### Table 4: `dispute_resolutions`
**Purpose:** Final outcome and decision
```sql
- id (UUID, PK)
- dispute_id (FK, UNIQUE)
- resolution_type (mutual_agreement, mediator_decision, system_refund, admin_decision)
- resolution_status (pending, approved, rejected, appealed)
- winning_party (FK, NULL if split)
- refund_amount (DECIMAL)
- refund_issued (BOOLEAN)
- resolved_by_admin_id (FK)
- resolution_reason, resolution_explanation (TEXT)
- appeal_count, can_appeal
- appeal_deadline (DATE)
- created_at, resolved_at
```

**Resolution Types:**
- **Mutual Agreement:** Both parties agree to terms
- **Mediator Decision:** Admin mediator decides
- **System Refund:** Automated refund based on policy
- **Admin Decision:** Management escalation

---

### Table 5: `dispute_appeals`
**Purpose:** Appeal mechanism
```sql
- id (UUID, PK)
- dispute_id (FK)
- resolution_id (FK)
- appealed_by (FK to profiles)
- appeal_reason (TEXT)
- appeal_evidence (TEXT)
- status (pending, approved, rejected, escalated)
- reviewed_by_admin_id (FK)
- created_at, reviewed_at
```

**Appeal Process:**
1. Losing party files appeal within deadline
2. Admin reviews appeal
3. Can be approved (reverses decision), rejected (upheld), or escalated

---

### Table 6: `dispute_metrics`
**Purpose:** Analytics and reporting
```sql
- id (UUID, PK)
- period_date (DATE)
- period_type (daily, weekly, monthly)
- total_disputes, open_disputes, resolved_disputes
- avg_resolution_time_hours
- Counts by category (quality, payment, deadline, etc.)
- Counts by severity (low, medium, high, critical)
- Financial metrics (total disputed, total refunded)
- Resolution outcomes (mutual, admin, appeals filed)
- created_at
```

**Metrics Tracked:**
- Dispute volume and trends
- Category distribution
- Severity distribution
- Resolution time averages
- Financial impact
- Success rates of different resolution types

---

### Table 7: `dispute_escalation_history`
**Purpose:** Track status changes
```sql
- id (UUID, PK)
- dispute_id (FK)
- from_status, to_status (VARCHAR)
- escalation_reason (TEXT)
- escalated_by (FK to profiles)
- created_at
```

**Use Cases:**
- Audit trail of all status changes
- Understanding escalation triggers
- Identifying bottlenecks
- Process improvement analysis

---

### Table 8: `dispute_user_reputation`
**Purpose:** User reputation tracking
```sql
- id (UUID, PK)
- user_id (FK to profiles, UNIQUE)
- total_disputes, total_as_complainant, total_as_respondent
- disputes_won, disputes_lost, disputes_settled
- win_rate (%), settlement_rate (%)
- reputation_score (0-100)
- risk_level (low, medium, high, critical)
- last_dispute_date, last_resolution_date
- account_suspended (BOOLEAN)
- suspension_reason
- created_at, updated_at
```

**Reputation Algorithm:**
```
reputation_score = 100 - (disputes_lost * 5) - (critical_disputes * 10) + (disputes_won * 2) + (disputes_settled * 1)
reputation_score = CLAMP(reputation_score, 0, 100)

Risk Level:
- Low: score >= 80
- Medium: 60-79
- High: 40-59
- Critical: < 40 OR account_suspended = TRUE
```

---

## 4. Database Views (for Admin Dashboard)

### View 1: `active_disputes`
Shows disputes needing attention with days open

### View 2: `dispute_resolution_summary`
Shows all resolved disputes with outcomes

### View 3: `high_risk_users`
Lists users with low reputation or suspended accounts

### View 4: `dispute_stats_by_category`
Aggregated statistics by dispute category

---

## 5. Admin Dashboard Features

### Reports Page Enhancement
Add new section: **Disputes**

**Display:**
1. **Open Disputes Count** - Urgent (red)
2. **Pending Resolutions** - Medium (yellow)
3. **Recent Closures** - Info (blue)

**Table Columns:**
- Transaction (Job/Service ID)
- Parties (Complainant ↔ Respondent)
- Category
- Severity
- Status
- Days Open
- Amount
- Actions (View, Assign, Resolve)

### Detailed Dispute View
- Timeline of events
- Evidence gallery
- Communication thread
- Settlement offers
- Admin notes
- Resolution options

### Resolution Panel
- Choose resolution type
- Set refund amount
- Add decision notes
- Publish resolution
- Handle appeals

### User Risk Management
- View high-risk user profiles
- Dispute history
- Win/loss record
- Suspend account option
- Monitor for patterns

---

## 6. Workflow & Status Progression

### Standard Dispute Lifecycle

```
1. OPEN
   ↓ (Admin assigns)
2. ASSIGNED_MEDIATOR
   ↓ (Admin reviews evidence)
3. UNDER_REVIEW
   ↓ (Parties negotiate)
4. NEGOTIATION
   ├→ RESOLVED (settlement reached)
   └→ ESCALATED (no agreement)
   ↓
5. ESCALATED
   ↓ (Management decision)
6. RESOLVED
   ↓ (Document resolution)
7. CLOSED
```

### Status Details

| Status | Who Can Act | Action | Next Status |
|--------|-------------|--------|------------|
| Open | Admin | Assign mediator | Assigned_Mediator |
| Assigned_Mediator | Admin | Review case | Under_Review |
| Under_Review | Both Parties | Submit evidence, make offers | Negotiation |
| Negotiation | Both Parties, Admin | Counter-offer, mediate | Resolved or Escalated |
| Escalated | Manager | Make decision | Resolved |
| Resolved | Loser | Appeal (if allowed) | Appeal process or Closed |
| Closed | None | Case finished | - |

---

## 7. Dispute Categories & Resolution Guidelines

### Quality of Work
**Indicators:** Poor craftsmanship, incomplete work, unmet specifications
**Resolution:** 
- Redo work (no refund)
- Partial refund (work partially salvageable)
- Full refund (work unusable)

### Payment Issues
**Indicators:** Non-payment, underpayment, disputed charges
**Resolution:**
- Process full payment
- Partial payment agreement
- Refund to client

### Deadline/Schedule
**Indicators:** Late completion, missed appointments, delays
**Resolution:**
- Penalty reduction
- Service credit
- Partial refund

### Communication
**Indicators:** Unresponsive, unclear expectations, no updates
**Resolution:**
- Service credit
- Goodwill gesture
- Documented expectations

### Safety/Conduct
**Indicators:** Unsafe practices, harassment, inappropriate behavior
**Resolution:**
- Account suspension
- Mandatory retraining
- Permanent ban

---

## 8. Financial Management

### Refund Processing
1. Admin approves refund
2. System calculates amount (full, partial, or zero)
3. Payment gateway processes refund
4. Record refund in resolution
5. Update user's dispute history
6. Send notifications

### Penalty System
- Quality issues: 5-20% refund
- Late delivery: 5-15% refund per day
- Safety violations: 25-100% refund
- Account suspension: Pending balances frozen

---

## 9. Reputation Scoring System

### Calculation Formula
```
reputation_score = 100
reputation_score -= (disputes_lost × 5)
reputation_score -= (high_severity_disputes × 10)
reputation_score -= (critical_severity_disputes × 15)
reputation_score += (disputes_settled × 1)
reputation_score += (disputes_won × 2)
reputation_score = CLAMP(reputation_score, 0, 100)
```

### Risk Level Assignment
- **Low (Green):** 80-100 - Trustworthy
- **Medium (Yellow):** 60-79 - Caution
- **High (Orange):** 40-59 - Watch closely
- **Critical (Red):** 0-39 OR Suspended - High risk

### Risk Actions
- **Medium:** Flag in search, lower in rankings
- **High:** Require additional verification, higher security deposit
- **Critical:** Suspend account, restrict from new transactions

---

## 10. Key Features

### For Clients
- File dispute with evidence
- Submit counter-evidence
- Make settlement offer
- Accept/reject resolution
- Appeal if needed
- View dispute history

### For Providers
- Respond to dispute
- Submit evidence
- Negotiate settlement
- Accept/reject resolution
- Appeal if needed
- View dispute impact on profile

### For Admins
- Manage dispute queue
- Assign mediators
- Review evidence
- Mediate negotiation
- Make final decisions
- Issue refunds
- Monitor metrics
- Manage user suspensions
- Generate reports

---

## 11. Implementation Roadmap

### Phase 1: Core Infrastructure
- [ ] Create 8 database tables
- [ ] Set up views and triggers
- [ ] Create API endpoints (CRUD)
- [ ] Build admin UI components

### Phase 2: Admin Dashboard
- [ ] Disputes listing page
- [ ] Detailed dispute view
- [ ] Resolution management
- [ ] User reputation display

### Phase 3: User Interfaces
- [ ] Client dispute filing
- [ ] Provider dispute response
- [ ] Communication thread UI
- [ ] Evidence upload

### Phase 4: Automation
- [ ] Auto-update reputation scores
- [ ] Email notifications
- [ ] Refund processing
- [ ] Metrics calculation

### Phase 5: Advanced Features
- [ ] Appeal system
- [ ] Escalation automation
- [ ] Mediation AI suggestions
- [ ] Predictive analytics

---

## 12. Expected Outcomes

### Before System
- Ad-hoc complaint handling
- Manual tracking
- No reputation data
- Inconsistent decisions
- No audit trail

### After System
- Structured dispute workflow
- Automated tracking and notifications
- Data-driven reputation scores
- Consistent decision framework
- Complete audit trail
- Better risk management
- Improved user trust

---

## 13. Success Metrics

| Metric | Target | Benefit |
|--------|--------|---------|
| Avg Resolution Time | < 7 days | Faster conflict resolution |
| Appeal Rate | < 10% | Better initial decisions |
| User Satisfaction | > 85% | Trust in platform |
| Dispute Reduction | Year-over-year decrease | Better user quality |
| Repeat Violators | Identified and managed | Safer marketplace |

---

## 14. SQL Deployment

Run the following SQL file in Supabase:
```bash
DISPUTE_RESOLUTION_SYSTEM.sql
```

This creates:
- 8 tables with proper constraints
- 4 analytical views
- 2 automated triggers
- Comprehensive indexing
- Complete documentation

---

## Conclusion

This dispute resolution system transforms LocalFix Kenya from a simple transaction platform into a trustworthy marketplace with proper conflict management, user accountability, and data-driven decision making.

**Key Benefits:**
- ✅ Transparent conflict resolution
- ✅ User accountability through reputation
- ✅ Data-driven admin decisions
- ✅ Complete audit trail
- ✅ Scalable to handle growth
