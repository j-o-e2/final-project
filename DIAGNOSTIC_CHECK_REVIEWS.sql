-- ============================================================================
-- DIAGNOSTIC: Check reviews table structure and foreign keys
-- ============================================================================

-- 1) Check if reviews table exists
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews') as reviews_table_exists;

-- 2) Show all columns in reviews table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema='public' AND table_name='reviews' 
ORDER BY ordinal_position;

-- 3) Show all foreign keys on reviews table
SELECT constraint_name, column_name, referenced_table_name, referenced_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE table_schema='public' AND table_name='reviews' AND constraint_type='FOREIGN KEY';

-- Alternative (PostgreSQL way):
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' AND tc.table_name = 'reviews' AND tc.constraint_type = 'FOREIGN KEY';

-- 4) Show all indexes on reviews
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname='public' AND tablename='reviews';

-- 5) Count reviews
SELECT COUNT(*) as review_count FROM public.reviews;
