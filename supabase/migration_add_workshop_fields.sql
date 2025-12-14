-- Migration: Add assigned workshop fields to accident_records table
-- Run this in your Supabase SQL editor

-- Add assigned workshop columns if they don't exist
DO $$ 
BEGIN
  -- Add assigned_workshop_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'assigned_workshop_name') THEN
    ALTER TABLE accident_records ADD COLUMN assigned_workshop_name TEXT;
  END IF;

  -- Add assigned_workshop_address column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'assigned_workshop_address') THEN
    ALTER TABLE accident_records ADD COLUMN assigned_workshop_address TEXT;
  END IF;

  -- Add assigned_workshop_phone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'assigned_workshop_phone') THEN
    ALTER TABLE accident_records ADD COLUMN assigned_workshop_phone TEXT;
  END IF;

  -- Add assigned_workshop_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'assigned_workshop_id') THEN
    ALTER TABLE accident_records ADD COLUMN assigned_workshop_id TEXT;
  END IF;
END $$;

