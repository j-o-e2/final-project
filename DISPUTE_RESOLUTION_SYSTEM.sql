-- ============================================================================
-- DISPUTE RESOLUTION SYSTEM - SINGLE TABLE SCHEMA
-- ============================================================================
-- Simplified disputes table handling all dispute tracking for LocalFix Kenya
-- marketplace between clients and providers.
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction Reference
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Parties Involved
  complainant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  respondent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Dispute Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'quality_of_work', 'payment', 'deadline', 'communication', 'safety', 'other'
  severity VARCHAR(50) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Status & Management
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'assigned', 'under_review', 'resolved', 'closed'
  assigned_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Evidence & Communications
  evidence_files JSONB, -- Array of {type, title, file_url, submitted_by, created_at}
  communications JSONB, -- Array of {sender_id, message_type, content, offered_amount, created_at}
  
  -- Financial Details
  disputed_amount DECIMAL(12, 2),
  refund_amount DECIMAL(12, 2),
  refund_issued BOOLEAN DEFAULT FALSE,
  currency VARCHAR(3) DEFAULT 'KES',
  
  -- Resolution Details
  resolution_type VARCHAR(100), -- 'mutual_agreement', 'mediator_decision', 'admin_decision', 'system_refund'
  resolution_reason TEXT,
  winning_party UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Appeal Information
  appeal_filed BOOLEAN DEFAULT FALSE,
  appeal_reason TEXT,
  appeal_status VARCHAR(50), -- 'pending', 'approved', 'rejected'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  priority INTEGER DEFAULT 5, -- 1-10
  days_to_resolve INTEGER,
  
  CONSTRAINT valid_amount CHECK (disputed_amount > 0),
  CONSTRAINT valid_status CHECK (status IN ('open', 'assigned', 'under_review', 'resolved', 'closed')),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_category CHECK (category IN ('quality_of_work', 'payment', 'deadline', 'communication', 'safety', 'other')),
  CONSTRAINT at_least_one_transaction CHECK (job_id IS NOT NULL OR booking_id IS NOT NULL)
);

-- Create indexes for faster queries
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_complainant ON disputes(complainant_id);
CREATE INDEX idx_disputes_respondent ON disputes(respondent_id);
CREATE INDEX idx_disputes_assigned_admin ON disputes(assigned_admin_id);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX idx_disputes_severity ON disputes(severity);
CREATE INDEX idx_disputes_job ON disputes(job_id);
CREATE INDEX idx_disputes_booking ON disputes(booking_id);

-- ============================================================================
-- USAGE EXAMPLES - QUERIES ONLY (No sample inserts to avoid FK constraint errors)
-- ============================================================================
-- Use these queries to work with disputes after they're created through the app

-- Example 1: Query active disputes needing attention
-- This shows all open, assigned, or under_review disputes
SELECT 
  id,
  title,
  category,
  severity,
  status,
  disputed_amount,
  EXTRACT(DAY FROM NOW() - created_at) as days_open
FROM disputes
WHERE status IN ('open', 'assigned', 'under_review')
ORDER BY severity DESC, created_at ASC;

-- Example 2: Query resolved disputes with refunds
-- This shows all completed disputes and their refund status
SELECT 
  id,
  title,
  category,
  resolution_type,
  disputed_amount,
  refund_amount,
  refund_issued,
  resolved_at
FROM disputes
WHERE status = 'resolved'
ORDER BY resolved_at DESC;

-- Example 3: Query disputes by category
-- Shows statistics grouped by dispute category
SELECT 
  category,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
  AVG(disputed_amount) as avg_amount,
  SUM(disputed_amount) as total_amount
FROM disputes
GROUP BY category
ORDER BY total DESC;

-- Example 4: Query disputes by severity
-- Shows distribution of disputes by severity level
SELECT 
  severity,
  COUNT(*) as total,
  AVG(disputed_amount) as avg_amount,
  MAX(disputed_amount) as max_amount,
  COUNT(CASE WHEN refund_issued = TRUE THEN 1 END) as refunds_issued
FROM disputes
GROUP BY severity
ORDER BY total DESC;

-- Example 5: Query high priority disputes
-- Shows disputes marked as urgent
SELECT 
  id,
  title,
  category,
  priority,
  status,
  EXTRACT(DAY FROM NOW() - created_at) as days_open
FROM disputes
WHERE priority >= 7
ORDER BY priority DESC, created_at ASC;

-- Example 6: Query disputes for a specific user
-- Replace 'user-id' with actual UUID
-- SELECT 
--   id,
--   title,
--   category,
--   severity,
--   status,
--   disputed_amount
-- FROM disputes
-- WHERE complainant_id = 'user-id' OR respondent_id = 'user-id'
-- ORDER BY created_at DESC;

-- Example 7: Query unresolved disputes by admin
-- Shows disputes assigned to a specific admin
-- Replace 'admin-id' with actual UUID
-- SELECT 
--   id,
--   title,
--   category,
--   severity,
--   status,
--   EXTRACT(DAY FROM NOW() - created_at) as days_open
-- FROM disputes
-- WHERE assigned_admin_id = 'admin-id' AND status != 'closed'
-- ORDER BY severity DESC, created_at ASC;
