-- ============================================================================
-- Insert placeholder profiles for orphan foreign-key references
-- ============================================================================
-- Run this FIRST in Supabase SQL Editor if you hit FK errors when adding
-- constraints (it inserts minimal placeholder `profiles` rows for any
-- user ids referenced by other tables but missing in `public.profiles`).
--
-- WARNING: This inserts placeholder records. Inspect them and replace
-- with real user data if available.
-- ============================================================================

BEGIN;

-- Jobs -> client_id (treat as clients)
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT DISTINCT j.client_id,
       ('placeholder client ' || left(j.client_id::text, 8))::text,
       NULL,
       'client',
       now()
FROM public.jobs j
WHERE j.client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = j.client_id);

-- Services -> provider_id (treat as workers)
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT DISTINCT s.provider_id,
       ('placeholder provider ' || left(s.provider_id::text, 8))::text,
       NULL,
       'worker',
       now()
FROM public.services s
WHERE s.provider_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.provider_id);

-- Job applications -> provider_id (workers)
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT DISTINCT ja.provider_id,
       ('placeholder applicant ' || left(ja.provider_id::text, 8))::text,
       NULL,
       'worker',
       now()
FROM public.job_applications ja
WHERE ja.provider_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ja.provider_id);

-- Reviews -> reviewer_id, reviewee_id, client_id, provider_id
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT DISTINCT r.reviewer_id,
       ('placeholder reviewer ' || left(r.reviewer_id::text, 8))::text,
       NULL,
       'worker',
       now()
FROM public.reviews r
WHERE r.reviewer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.reviewer_id);

INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT DISTINCT r.reviewee_id,
       ('placeholder reviewee ' || left(r.reviewee_id::text, 8))::text,
       NULL,
       'worker',
       now()
FROM public.reviews r
WHERE r.reviewee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.reviewee_id);

INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT DISTINCT r.client_id,
       ('placeholder client ' || left(r.client_id::text, 8))::text,
       NULL,
       'client',
       now()
FROM public.reviews r
WHERE r.client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.client_id);

INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT DISTINCT r.provider_id,
       ('placeholder provider ' || left(r.provider_id::text, 8))::text,
       NULL,
       'worker',
       now()
FROM public.reviews r
WHERE r.provider_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.provider_id);

COMMIT;

-- Verification: list inserted placeholders (run separately if desired)
-- SELECT * FROM public.profiles WHERE email IS NULL ORDER BY created_at DESC LIMIT 50;