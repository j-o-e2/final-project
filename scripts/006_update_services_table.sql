-- Add provider_id to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update RLS policies for services table
DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;
DROP POLICY IF EXISTS "Services are insertable by authenticated users with admin role" ON services;

-- New policies for services
CREATE POLICY "Services are viewable by everyone"
    ON services FOR SELECT
    USING (true);

CREATE POLICY "Workers can insert their own services"
    ON services FOR INSERT
    TO authenticated
    WITH CHECK (
        provider_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'worker'
        )
    );

CREATE POLICY "Workers can update their own services"
    ON services FOR UPDATE
    TO authenticated
    USING (provider_id = auth.uid())
    WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Workers can delete their own services"
    ON services FOR DELETE
    TO authenticated
    USING (provider_id = auth.uid());

-- Update existing services to have provider IDs (optional)
-- You'll need to set these to actual worker profile IDs from your database
-- UPDATE services SET provider_id = 'worker-profile-id' WHERE provider_id IS NULL;