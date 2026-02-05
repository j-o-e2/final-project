-- Migration: Clean `required_skills` text[] elements that contain JSON/array-like strings
-- This converts entries like '{"[\"Plumbing\"]"}' or text[] elements that contain a JSON array string
-- into a flat text[] of skill strings: {'Plumbing'}.
-- Run in Supabase SQL editor or psql. Backup your DB before running in production.

BEGIN;

-- 0) Preview rows that likely contain JSON/array-like elements
-- Use this SELECT first to inspect and confirm the affected rows.
-- Rows returned here have at least one element that starts with '[' indicating a JSON-like string.
-- Run separately before the UPDATE.
-- SELECT id, required_skills, array_to_string(required_skills, ',') AS skills_preview
-- FROM public.jobs
-- WHERE required_skills IS NOT NULL
--   AND EXISTS (SELECT 1 FROM unnest(required_skills) el WHERE el LIKE '[%');

-- 1) Perform cleaning: for each job, expand each array element; if an element is a JSON array string (starts with '['),
--    extract its items and include each as separate array elements; otherwise include the element text as-is.
--    Trim surrounding whitespace for safety. Result is coalesced to an empty array if there are no items.

UPDATE public.jobs j
SET required_skills = COALESCE(cleaned.arr, ARRAY[]::text[])
FROM (
  SELECT j2.id, array_agg(trim(v.val)) AS arr
  FROM public.jobs j2
  CROSS JOIN LATERAL (
    -- Expand each element to one or more cleaned values
    SELECT val
    FROM (
      -- If element looks like JSON array (starts with '['), parse it and return its items
      SELECT jsonb_array_elements_text(el::jsonb) AS val
      FROM unnest(j2.required_skills) AS t(el)
      WHERE el IS NOT NULL AND el::text LIKE '[%'

      UNION ALL

      -- Otherwise, return the element text
      SELECT el::text AS val
      FROM unnest(j2.required_skills) AS t2(el)
      WHERE el IS NOT NULL AND NOT (el::text LIKE '[%')
    ) s
  ) v
  GROUP BY j2.id
) cleaned
WHERE j.id = cleaned.id
  -- Only update rows where at least one element looks like JSON/array-like to avoid unnecessary writes
  AND EXISTS (SELECT 1 FROM unnest(j.required_skills) el WHERE el LIKE '[%');

COMMIT;

-- After running, verify with:
-- SELECT id, required_skills, pg_typeof(required_skills) FROM public.jobs WHERE id IN (/* list some ids */) LIMIT 50;
-- Or check for any remaining JSON-like elements:
-- SELECT id, required_skills FROM public.jobs WHERE EXISTS (SELECT 1 FROM unnest(required_skills) el WHERE el LIKE '[%');

-- Notes:
-- - This script assumes `required_skills` is already a text[] column. If it's not, run scripts/030_normalize_required_skills.sql first.
-- - It attempts to preserve all items; e.g., if a row had elements: ['["Plumbing","Electrical"]', 'Carpentry'] -> result: ['Plumbing','Electrical','Carpentry']
-- - Always run the preview SELECT first and back up your data before applying to production.
