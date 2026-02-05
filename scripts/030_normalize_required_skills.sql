-- Migration: Normalize `required_skills` column to text[] and convert common stored formats
-- This script is idempotent and safe to run multiple times.
-- It will:
--  - Ensure `required_skills` exists as text[]
--  - If the existing column is text/varchar containing JSON or comma-separated values, convert them to text[]
--  - If the existing column is jsonb, convert json array to text[]

BEGIN;

DO $$
DECLARE
  udt TEXT;
BEGIN
  SELECT c.udt_name INTO udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'jobs' AND c.column_name = 'required_skills'
  LIMIT 1;

  IF udt IS NULL THEN
    -- Column missing: create as text[] with default
    ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_skills text[] DEFAULT '{}'::text[];
    RAISE NOTICE 'required_skills column did not exist; created as text[]';
    RETURN;
  END IF;

  RAISE NOTICE 'required_skills current udt_name = %', udt;

  IF udt = '_text' THEN
    RAISE NOTICE 'required_skills already text[]; nothing to do';

  ELSIF udt = 'jsonb' THEN
    -- Convert jsonb array -> text[]
    ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_skills_tmp text[] DEFAULT '{}'::text[];

    UPDATE public.jobs
    SET required_skills_tmp = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(required_skills::jsonb) AS t(x)),
      ARRAY[]::text[]
    );

    ALTER TABLE public.jobs DROP COLUMN IF EXISTS required_skills;
    ALTER TABLE public.jobs RENAME COLUMN required_skills_tmp TO required_skills;

    RAISE NOTICE 'Converted jsonb -> text[] for required_skills';

  ELSIF udt IN ('text','varchar','character varying') THEN
    -- Convert common string formats to text[] safely
    ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_skills_tmp text[] DEFAULT '{}'::text[];

    UPDATE public.jobs
    SET required_skills_tmp = CASE
      WHEN required_skills IS NULL THEN ARRAY[]::text[]
      WHEN trim(required_skills) = '' THEN ARRAY[]::text[]
      WHEN trim(required_skills) IN ('[]','{}') THEN ARRAY[]::text[]
      WHEN trim(required_skills) LIKE '[%' THEN (
        -- Assume JSON array string
        (SELECT array_agg(x) FROM jsonb_array_elements_text(required_skills::jsonb) AS t(x))
      )
      WHEN required_skills LIKE '%,%' THEN string_to_array(required_skills, ',')
      ELSE ARRAY[required_skills]
    END;

    ALTER TABLE public.jobs DROP COLUMN IF EXISTS required_skills;
    ALTER TABLE public.jobs RENAME COLUMN required_skills_tmp TO required_skills;

    RAISE NOTICE 'Converted text/varchar -> text[] for required_skills';
  ELSE
    RAISE NOTICE 'Unhandled required_skills udt_name: % - no automatic conversion performed', udt;
  END IF;
END$$;

COMMIT;

-- After running: inspect rows with
-- SELECT id, required_skills FROM public.jobs WHERE required_skills IS NULL OR cardinality(required_skills)=0 LIMIT 50;

