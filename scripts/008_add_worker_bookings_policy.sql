-- Add policy to allow workers to view bookings for their services
CREATE POLICY "Workers can view bookings for their services"
    ON bookings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM services
            WHERE services.id = bookings.service_id
            AND services.provider_id = auth.uid()
        )
    );