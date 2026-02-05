-- ============================================================================
-- SIMPLE CHECK: Is reviews.client_id linked to profiles.id?
-- ============================================================================

-- 1) Check if client_id column exists in reviews
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema='public' AND table_name='reviews' AND column_name='client_id';

-- 2) Show all columns in reviews
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema='public' AND table_name='reviews' 
ORDER BY ordinal_position;

-- 3) Show all foreign keys on reviews table
SELECT 
    kcu.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.key_column_usage kcu
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_schema='public' 
  AND kcu.table_name='reviews'
  AND kcu.column_name IN ('client_id', 'reviewer_id', 'worker_id')
ORDER BY kcu.constraint_name;
