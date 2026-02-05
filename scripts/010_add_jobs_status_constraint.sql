-- Add CHECK constraint to jobs status column
-- This migration adds a constraint for allowed job statuses while preserving existing data
-- Allowed statuses: open (default), approved, cancelled, rejected, reopen, completed, closed

-- First, ensure any existing status values are within the allowed list
-- Update any unexpected values to 'open' (the default)
UPDATE jobs 
SET status = 'open' 
WHERE status NOT IN ('open','approved','cancelled','rejected','reopen','completed','closed');

-- Add the CHECK constraint
ALTER TABLE jobs
ADD CONSTRAINT jobs_status_check 
CHECK (status IN ('open','approved','cancelled','rejected','reopen','completed','closed'));
