-- Migration: Update accident_records table columns to match new naming convention
-- Run this in your Supabase SQL editor
-- This migration renames columns to match the new field mapping

-- Step 1: Add new columns (if they don't exist)
DO $$ 
BEGIN
  -- Add case_no column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'case_no') THEN
    ALTER TABLE accident_records ADD COLUMN case_no TEXT;
  END IF;

  -- Add incident_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'incident_date') THEN
    ALTER TABLE accident_records ADD COLUMN incident_date TIMESTAMPTZ;
  END IF;

  -- Add car_no column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'car_no') THEN
    ALTER TABLE accident_records ADD COLUMN car_no TEXT;
  END IF;

  -- Add deductible_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'deductible_type') THEN
    ALTER TABLE accident_records ADD COLUMN deductible_type TEXT;
  END IF;

  -- Add insurance column if it doesn't exist (may already exist)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'insurance') THEN
    ALTER TABLE accident_records ADD COLUMN insurance TEXT;
  END IF;

  -- Add damage_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'damage_type') THEN
    ALTER TABLE accident_records ADD COLUMN damage_type TEXT;
  END IF;

  -- Add accident_location column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'accident_location') THEN
    ALTER TABLE accident_records ADD COLUMN accident_location TEXT;
  END IF;

  -- Add manager column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'manager') THEN
    ALTER TABLE accident_records ADD COLUMN manager TEXT;
  END IF;

  -- Add memo column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'memo') THEN
    ALTER TABLE accident_records ADD COLUMN memo TEXT;
  END IF;

  -- Add deductible column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'deductible') THEN
    ALTER TABLE accident_records ADD COLUMN deductible TEXT;
  END IF;

  -- Add car_model column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'car_model') THEN
    ALTER TABLE accident_records ADD COLUMN car_model TEXT;
  END IF;
END $$;

-- Step 2: Migrate data from old columns to new columns
-- Use conditional logic to check if columns exist before referencing them
DO $$
BEGIN
  -- Migrate case_no
  UPDATE accident_records 
  SET case_no = COALESCE(case_no, receipt_number)
  WHERE case_no IS NULL AND receipt_number IS NOT NULL;

  -- Migrate incident_date (from accident_time if it exists)
  -- Handle empty strings and invalid date formats safely using a function
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'accident_time') THEN
    -- Use a safer approach: only update rows where accident_time looks like a valid timestamp
    -- First, handle TEXT columns that might contain date strings
    UPDATE accident_records 
    SET incident_date = CASE 
      WHEN accident_time::text IS NULL OR accident_time::text = '' THEN NULL
      WHEN accident_time::text ~ '^\d{4}-\d{2}-\d{2}' THEN
        -- Try to parse as timestamp, catch errors by checking format first
        CASE 
          WHEN accident_time::text ~ '^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}' THEN
            -- Has date and time, try to cast
            (accident_time::text)::TIMESTAMPTZ
          WHEN accident_time::text ~ '^\d{4}-\d{2}-\d{2}$' THEN
            -- Date only, add default time
            (accident_time::text || ' 00:00:00')::TIMESTAMPTZ
          ELSE NULL
        END
      ELSE NULL
    END
    WHERE incident_date IS NULL 
      AND accident_time IS NOT NULL 
      AND accident_time::text != ''
      AND accident_time::text ~ '^\d{4}-\d{2}-\d{2}';
  END IF;

  -- Migrate car_no
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'car_number') THEN
    UPDATE accident_records 
    SET car_no = COALESCE(car_no, car_number)
    WHERE car_no IS NULL AND car_number IS NOT NULL;
  END IF;

  -- Migrate insurance
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'insurer') THEN
    UPDATE accident_records 
    SET insurance = COALESCE(insurance, insurer)
    WHERE insurance IS NULL AND insurer IS NOT NULL;
  END IF;

  -- Migrate deductible_type
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'deductible_pay_type') THEN
    UPDATE accident_records 
    SET deductible_type = COALESCE(deductible_type, deductible_pay_type)
    WHERE deductible_type IS NULL AND deductible_pay_type IS NOT NULL;
  END IF;

  -- Migrate damage_type (from damage_location if it exists, otherwise leave as is)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'damage_location') THEN
    UPDATE accident_records 
    SET damage_type = COALESCE(damage_type, damage_location)
    WHERE damage_type IS NULL AND damage_location IS NOT NULL;
  END IF;

  -- Migrate car_model
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'vehicle_model') THEN
    UPDATE accident_records 
    SET car_model = COALESCE(car_model, vehicle_model)
    WHERE car_model IS NULL AND vehicle_model IS NOT NULL;
  END IF;

  -- Migrate memo
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'request_detail') THEN
    UPDATE accident_records 
    SET memo = COALESCE(memo, request_detail)
    WHERE memo IS NULL AND request_detail IS NOT NULL;
  END IF;

  -- Migrate manager
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'branch') THEN
    UPDATE accident_records 
    SET manager = COALESCE(manager, branch)
    WHERE manager IS NULL AND branch IS NOT NULL;
  END IF;
END $$;

-- Step 3: Handle duplicates and make case_no NOT NULL and UNIQUE (after data migration)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- First, ensure all records have a case_no
  UPDATE accident_records SET case_no = receipt_number WHERE case_no IS NULL;
  
  -- Check for duplicates in case_no
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT case_no, COUNT(*) as cnt
    FROM accident_records
    WHERE case_no IS NOT NULL
    GROUP BY case_no
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- If duplicates exist, handle them by appending a suffix
  IF duplicate_count > 0 THEN
    -- For duplicate case_no values, keep the first one (by created_at) and append suffix to others
    -- Use a CTE to identify duplicates and update them
    WITH duplicates AS (
      SELECT id, case_no,
             ROW_NUMBER() OVER (PARTITION BY case_no ORDER BY created_at, id) as rn
      FROM accident_records
      WHERE case_no IN (
        SELECT case_no
        FROM accident_records
        WHERE case_no IS NOT NULL
        GROUP BY case_no
        HAVING COUNT(*) > 1
      )
    )
    UPDATE accident_records a
    SET case_no = a.case_no || '_' || d.rn::text
    FROM duplicates d
    WHERE a.id = d.id AND d.rn > 1;
    
    RAISE NOTICE 'Found and resolved % duplicate case_no values', duplicate_count;
  END IF;
  
  -- Then add constraints
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'accident_records' AND column_name = 'case_no') THEN
    -- Remove old unique constraint on receipt_number if exists
    ALTER TABLE accident_records DROP CONSTRAINT IF EXISTS accident_records_receipt_number_key;
    
    -- Verify no duplicates remain before adding constraint
    SELECT COUNT(*) INTO duplicate_count
    FROM (
      SELECT case_no, COUNT(*) as cnt
      FROM accident_records
      WHERE case_no IS NOT NULL
      GROUP BY case_no
      HAVING COUNT(*) > 1
    ) remaining_duplicates;
    
    IF duplicate_count = 0 THEN
      -- Add unique constraint on case_no
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accident_records_case_no_key') THEN
        ALTER TABLE accident_records ADD CONSTRAINT accident_records_case_no_key UNIQUE (case_no);
      END IF;
      
      -- Make case_no NOT NULL
      ALTER TABLE accident_records ALTER COLUMN case_no SET NOT NULL;
    ELSE
      RAISE EXCEPTION 'Cannot add UNIQUE constraint: % duplicate case_no values still exist', duplicate_count;
    END IF;
  END IF;
END $$;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_accident_receipt_number;
CREATE INDEX IF NOT EXISTS idx_accident_case_no ON accident_records(case_no);
CREATE INDEX IF NOT EXISTS idx_accident_customer_name ON accident_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_accident_phone ON accident_records(phone);
CREATE INDEX IF NOT EXISTS idx_accident_car_no ON accident_records(car_no);
CREATE INDEX IF NOT EXISTS idx_accident_status ON accident_records(status);
CREATE INDEX IF NOT EXISTS idx_accident_created_at ON accident_records(created_at DESC);

-- Step 5: (Optional) Drop old columns after verifying data migration
-- Uncomment these lines ONLY after verifying that all data has been migrated successfully
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS receipt_number;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS accident_time;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS car_number;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS insurer;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS deductible_pay_type;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS damage_location;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS vehicle_model;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS request_detail;
-- ALTER TABLE accident_records DROP COLUMN IF EXISTS branch;

-- Note: Keep old columns for backward compatibility during transition period
-- Remove them only after confirming everything works with new column names

