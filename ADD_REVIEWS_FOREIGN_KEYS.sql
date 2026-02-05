-- ============================================================================
-- FIX: Add foreign key constraints linking reviews to profiles
-- ============================================================================
-- This creates links:
-- reviews.reviewer_id → profiles.id
-- reviews.reviewee_id → profiles.id
--
-- Run this in Supabase SQL Editor
--
-- ============================================================================

-- Step 1: Drop existing constraints if they exist (clean slate)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewee_id_fkey;

-- Step 2: Add foreign key for reviewer_id (the person writing the review)
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_reviewer_id_fkey
FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 3: Add foreign key for reviewee_id (the person being reviewed)
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_reviewee_id_fkey
FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 4: Verify the constraints were created
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema='public' AND table_name='reviews' AND constraint_type='FOREIGN KEY'
ORDER BY constraint_name;

-- Step 5: Show the foreign keys with their references
SELECT 
    kcu.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.key_column_usage kcu
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_schema='public' AND kcu.table_name='reviews'
ORDER BY kcu.constraint_name;
