-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR DISPUTES TABLE
-- ============================================================================
-- These policies control who can view, create, and modify disputes
-- Ensures users only see their own disputes and admins can manage all disputes
-- ============================================================================

-- First, ENABLE RLS on the disputes table
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. POLICY: Allow users to SELECT their own disputes
-- ============================================================================
-- Users can view disputes where they are the complainant or respondent
CREATE POLICY "Users can view their own disputes"
ON disputes
FOR SELECT
USING (
  auth.uid() = complainant_id 
  OR auth.uid() = respondent_id
  OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- ============================================================================
-- 2. POLICY: Allow users to INSERT (file) disputes
-- ============================================================================
-- Users can create a dispute only for themselves (as complainant)
-- Cannot create disputes for other people
CREATE POLICY "Users can file their own disputes"
ON disputes
FOR INSERT
WITH CHECK (
  auth.uid() = complainant_id
  AND (job_id IS NOT NULL OR booking_id IS NOT NULL)
);

-- ============================================================================
-- 3. POLICY: Allow respondents to UPDATE their response fields
-- ============================================================================
-- Respondents can update communications in disputes where they are respondent
-- This allows them to add evidence and respond to complaints
CREATE POLICY "Respondents can add communications"
ON disputes
FOR UPDATE
USING (auth.uid() = respondent_id)
WITH CHECK (
  auth.uid() = respondent_id
);

-- ============================================================================
-- 4. POLICY: Allow complainants to UPDATE their dispute (add evidence, etc)
-- ============================================================================
-- Complainants can update their own dispute details and add evidence
CREATE POLICY "Complainants can update their dispute"
ON disputes
FOR UPDATE
USING (auth.uid() = complainant_id)
WITH CHECK (
  auth.uid() = complainant_id
);

-- ============================================================================
-- 5. POLICY: Allow ADMINS to do everything
-- ============================================================================
-- Admins can view, insert, update, and delete any dispute
-- This is checked via the role field in profiles table
CREATE POLICY "Admins can manage all disputes"
ON disputes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- 6. POLICY: Allow DELETE only by Admins
-- ============================================================================
-- Only admins can delete disputes (if needed for cleanup)
CREATE POLICY "Only admins can delete disputes"
ON disputes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'disputes';

-- Expected output: disputes | t (true means RLS is enabled)

-- List all policies on disputes table
-- SELECT policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'disputes'
-- ORDER BY policyname;

-- ============================================================================
-- POLICY BEHAVIOR REFERENCE
-- ============================================================================

/*
COMPLAINANT (User who filed the dispute):
- SELECT: Can view their own disputes ✓
- INSERT: Can create new disputes ✓
- UPDATE: Can update evidence_files and communications ✓
- DELETE: Cannot delete ✗

RESPONDENT (User being complained about):
- SELECT: Can view disputes where they are respondent ✓
- INSERT: Cannot create new disputes for themselves ✗ (only appears as respondent)
- UPDATE: Can add communications (responses, offers) ✓
- DELETE: Cannot delete ✗

ADMIN:
- SELECT: Can view all disputes ✓
- INSERT: Can create disputes (if needed) ✓
- UPDATE: Can update any field ✓
- DELETE: Can delete disputes ✓

REGULAR USER (not involved):
- SELECT: Cannot see any disputes ✗
- INSERT: Cannot create disputes for others ✗
- UPDATE: Cannot modify disputes ✗
- DELETE: Cannot delete ✗
*/

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================

-- Test 1: User should see only their disputes
-- After login, run as the user:
-- SELECT id, title, complainant_id, respondent_id FROM disputes;
-- Result: Only disputes where user is complainant or respondent

-- Test 2: User should NOT be able to insert dispute with wrong complainant
-- This should fail:
-- INSERT INTO disputes (job_id, complainant_id, respondent_id, title, description, category, disputed_amount)
-- VALUES ('...', 'someone-else-id', '...', '...', '...', '...', 1000);

-- Test 3: Admin should see all disputes
-- After login as admin, run:
-- SELECT COUNT(*) FROM disputes;
-- Result: Total count of all disputes in system

-- Test 4: Admin should be able to delete disputes
-- INSERT then DELETE should work for admins
