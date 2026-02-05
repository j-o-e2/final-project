-- ============================================================================
-- DIAGNOSE_MESSAGES.sql
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose message relationship issues.
--
SELECT '=== MESSAGES SAMPLE (first 50 rows) ===' AS section;
SELECT id, job_id, job_application_id, booking_id, sender_id, recipient_id, content, created_at, updated_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 50;

SELECT '' AS blank;
SELECT '=== MISSING FK CONSTRAINTS (expected messages_sender_id_fkey/messages_recipient_id_fkey) ===' AS section;
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND table_name = 'messages' AND constraint_name LIKE 'messages_%_fkey';

SELECT '' AS blank;
SELECT '=== INDEXES ON messages ===' AS section;
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'messages';

SELECT '' AS blank;
SELECT '=== RLS POLICIES ON messages ===' AS section;
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'messages' ORDER BY policyname;

SELECT '' AS blank;
SELECT 'If relationships are missing, run FIX_TABLE_RELATIONSHIPS_CORRECTED.sql after running CLEANUP_ORPHANED_DATA.sql.' AS help;
