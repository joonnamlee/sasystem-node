-- Migration: Create statistics functions for accident_records
-- Run this in your Supabase SQL editor
-- IMPORTANT: Run migration_add_soft_delete.sql first to create is_deleted column

-- Step 1: Ensure is_deleted column exists (if not, create it)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'is_deleted') THEN
    ALTER TABLE accident_records ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

-- Step 2: Ensure deleted_at column exists (if not, create it)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'deleted_at') THEN
    ALTER TABLE accident_records ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 3: Update existing records to ensure is_deleted is false (if NULL)
UPDATE accident_records 
SET is_deleted = false 
WHERE is_deleted IS NULL;

-- Function: Daily statistics
CREATE OR REPLACE FUNCTION stats_daily(include_deleted boolean)
RETURNS TABLE (
  day date,
  total_cases bigint
)
LANGUAGE sql
AS $$
  SELECT 
    date(created_at) as day,
    count(*) as total_cases
  FROM accident_records
  WHERE (include_deleted OR is_deleted = false)
  GROUP BY date(created_at)
  ORDER BY day DESC;
$$;

-- Function: Monthly statistics
CREATE OR REPLACE FUNCTION stats_monthly(include_deleted boolean)
RETURNS TABLE (
  month text,
  total_cases bigint
)
LANGUAGE sql
AS $$
  SELECT 
    to_char(created_at, 'YYYY-MM') as month,
    count(*) as total_cases
  FROM accident_records
  WHERE (include_deleted OR is_deleted = false)
  GROUP BY to_char(created_at, 'YYYY-MM')
  ORDER BY month DESC;
$$;

-- Function: Insurer statistics
CREATE OR REPLACE FUNCTION stats_insurer(include_deleted boolean)
RETURNS TABLE (
  insurer text,
  total_cases bigint,
  avg_assign_minutes numeric
)
LANGUAGE sql
AS $$
  SELECT 
    COALESCE(insurance, insurer, '미지정') as insurer,
    count(*) as total_cases,
    AVG(
      CASE 
        WHEN assigned_workshop_name IS NOT NULL AND created_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
        ELSE NULL
      END
    ) as avg_assign_minutes
  FROM accident_records
  WHERE (include_deleted OR is_deleted = false)
  GROUP BY COALESCE(insurance, insurer, '미지정')
  ORDER BY total_cases DESC;
$$;

-- Function: Shop (workshop) statistics
CREATE OR REPLACE FUNCTION stats_shop(include_deleted boolean)
RETURNS TABLE (
  assigned_shop_name text,
  assigned_count bigint,
  completed_count bigint
)
LANGUAGE sql
AS $$
  SELECT 
    COALESCE(assigned_workshop_name, '미배정') as assigned_shop_name,
    count(*) as assigned_count,
    count(*) FILTER (WHERE status IN ('시공완료', '정산완료')) as completed_count
  FROM accident_records
  WHERE (include_deleted OR is_deleted = false)
  GROUP BY COALESCE(assigned_workshop_name, '미배정')
  ORDER BY assigned_count DESC;
$$;

-- Grant execute permissions (adjust based on your RLS policies)
-- GRANT EXECUTE ON FUNCTION stats_daily(boolean) TO authenticated;
-- GRANT EXECUTE ON FUNCTION stats_monthly(boolean) TO authenticated;
-- GRANT EXECUTE ON FUNCTION stats_insurer(boolean) TO authenticated;
-- GRANT EXECUTE ON FUNCTION stats_shop(boolean) TO authenticated;

