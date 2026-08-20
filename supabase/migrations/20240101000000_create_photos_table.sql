-- ============================================================
-- RAMESH POLISETTY — Photos Table Migration
-- Creates the photos table for storing photo metadata
-- ============================================================

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('transformations', 'achievements', 'powerlifting', 'coach', 'clients')),
  label TEXT NOT NULL,
  note TEXT DEFAULT '',
  file_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);

-- Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (anyone can view photos)
CREATE POLICY "Public read access" ON photos
  FOR SELECT USING (true);

-- Policy: Authenticated insert (only logged-in users can add photos)
CREATE POLICY "Authenticated insert" ON photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated update (only logged-in users can update their photos)
CREATE POLICY "Authenticated update" ON photos
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Authenticated delete (only logged-in users can delete their photos)
CREATE POLICY "Authenticated delete" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Admin full access (admins can do everything)
CREATE POLICY "Admin full access" ON photos
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'admin@rameshpolisetty.com'
        OR (auth.users.raw_user_meta_data->>'role')::text = 'admin'
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
