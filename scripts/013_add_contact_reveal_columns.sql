-- Add columns to control when contact details are revealed
BEGIN;

ALTER TABLE IF EXISTS job_applications
  ADD COLUMN IF NOT EXISTS client_contact_revealed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS provider_contact_revealed BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
