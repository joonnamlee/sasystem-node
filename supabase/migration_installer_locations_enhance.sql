-- Migration: Add system columns to installer_locations table
-- Run this in your Supabase SQL editor

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'installer_locations' AND column_name = 'is_active') THEN
    ALTER TABLE installer_locations ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add priority column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'installer_locations' AND column_name = 'priority') THEN
    ALTER TABLE installer_locations ADD COLUMN priority INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add memo column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'installer_locations' AND column_name = 'memo') THEN
    ALTER TABLE installer_locations ADD COLUMN memo TEXT;
  END IF;
END $$;

-- Update existing records: set is_active = true for all existing records
UPDATE installer_locations SET is_active = true WHERE is_active IS NULL;
UPDATE installer_locations SET priority = 0 WHERE priority IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_installer_is_active ON installer_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_installer_priority ON installer_locations(priority);
CREATE INDEX IF NOT EXISTS idx_installer_coords ON installer_locations(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

