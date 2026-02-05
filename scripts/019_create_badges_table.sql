-- Migration: Create badges table and RLS policies

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  awarded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  awarded_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  badge TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_awarded_to ON badges(awarded_to);
CREATE INDEX IF NOT EXISTS idx_badges_awarded_by ON badges(awarded_by);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can read badges
CREATE POLICY "Badges are viewable by everyone" ON badges
  FOR SELECT USING (true);

-- Only authenticated admin users can insert badges (award badges)
CREATE POLICY "Admins can award badges" ON badges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only the awarding admin can update their badge (and must be admin)
CREATE POLICY "Awarding admin can update their badge" ON badges
  FOR UPDATE
  TO authenticated
  USING (awarded_by = auth.uid())
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only the awarding admin can delete the badge
CREATE POLICY "Awarding admin can delete their badge" ON badges
  FOR DELETE
  TO authenticated
  USING (awarded_by = auth.uid());

-- End migration
