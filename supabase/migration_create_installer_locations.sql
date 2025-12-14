-- Migration: Create installer_locations table
-- Run this in your Supabase SQL editor if the table doesn't exist

-- Table: installer_locations
CREATE TABLE IF NOT EXISTS installer_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seq TEXT,
  name TEXT,
  address TEXT,
  phone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for installer_locations
CREATE INDEX IF NOT EXISTS idx_installer_seq ON installer_locations(seq);
CREATE INDEX IF NOT EXISTS idx_installer_name ON installer_locations(name);

-- Enable Row Level Security (RLS)
ALTER TABLE installer_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public access (adjust based on your security needs)
DROP POLICY IF EXISTS "Allow public access installers" ON installer_locations;
CREATE POLICY "Allow public access installers" ON installer_locations FOR ALL USING (true);

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_installer_locations_updated_at ON installer_locations;
CREATE TRIGGER update_installer_locations_updated_at
  BEFORE UPDATE ON installer_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

