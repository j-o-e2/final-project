-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
    -- Allowed statuses: pending, confirmed, approved, completed, cancelled, open, closed
    -- Keep values in sync with frontend types in lib/types.ts (pending, confirmed, completed, cancelled)
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','approved','completed','cancelled','open','closed')),
    -- Timestamp when a booking was completed (nullable)
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add RLS policies for services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone"
    ON services FOR SELECT
    USING (true);

CREATE POLICY "Services are insertable by authenticated users with admin role"
    ON services FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Add RLS policies for bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY "Clients can create their own bookings"
    ON bookings FOR INSERT
    TO authenticated
    WITH CHECK (client_id = auth.uid());

-- Add some sample services
INSERT INTO services (name, description, price, duration) VALUES
    ('House Cleaning', 'Complete house cleaning service including dusting, mopping, and sanitization', 100.00, '3 hours'),
    ('Garden Maintenance', 'Lawn mowing, weeding, and general garden care', 80.00, '2 hours'),
    ('Plumbing Service', 'General plumbing repairs and maintenance', 120.00, '2 hours'),
    ('Electrical Service', 'Electrical repairs and installations', 150.00, '2 hours'),
    ('Painting Service', 'Interior and exterior painting', 200.00, '4 hours');