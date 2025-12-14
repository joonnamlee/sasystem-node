-- Migration: Add soft delete fields to accident_records table
-- Run this in your Supabase SQL editor

-- Step 1: Add is_deleted column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'is_deleted') THEN
    ALTER TABLE accident_records ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

-- Step 2: Add deleted_at column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'deleted_at') THEN
    ALTER TABLE accident_records ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 3: Create index on is_deleted for better query performance
CREATE INDEX IF NOT EXISTS idx_accident_records_is_deleted ON accident_records(is_deleted) WHERE is_deleted = false;

-- Step 4: Update existing records to ensure is_deleted is false (if NULL)
UPDATE accident_records 
SET is_deleted = false 
WHERE is_deleted IS NULL;

-- Note: All queries should now filter by .eq("is_deleted", false) to exclude soft-deleted records

