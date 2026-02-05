-- Drop existing RLS policies for bookings
DROP POLICY IF EXISTS "Clients can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can create their own bookings" ON bookings;

-- Create new RLS policies for bookings
CREATE POLICY "Users can view bookings they are involved with"
    ON bookings FOR SELECT
    TO authenticated
    USING (
        client_id = auth.uid() OR  -- Client can see their own bookings
        EXISTS (  -- Worker can see bookings for their services
            SELECT 1 FROM services
            WHERE services.id = bookings.service_id
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Clients can create bookings"
    ON bookings FOR INSERT
    TO authenticated
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Workers can update their service bookings"
    ON bookings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM services
            WHERE services.id = bookings.service_id
            AND services.provider_id = auth.uid()
        )
    );