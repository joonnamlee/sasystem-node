-- Supabase migration script for accidents table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS accidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  accident_time TEXT,
  customer_name TEXT,
  phone TEXT,
  car_number TEXT,
  vin TEXT,
  car_model TEXT,
  insurer TEXT,
  manager TEXT,
  damage_type TEXT,
  accident_location TEXT,
  memo TEXT,
  deductible TEXT,
  deductible_pay_type TEXT,
  status TEXT DEFAULT '신규',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_accidents_receipt_number ON accidents(receipt_number);
CREATE INDEX IF NOT EXISTS idx_accidents_customer_name ON accidents(customer_name);
CREATE INDEX IF NOT EXISTS idx_accidents_phone ON accidents(phone);
CREATE INDEX IF NOT EXISTS idx_accidents_car_number ON accidents(car_number);
CREATE INDEX IF NOT EXISTS idx_accidents_status ON accidents(status);
CREATE INDEX IF NOT EXISTS idx_accidents_created_at ON accidents(created_at DESC);

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE accidents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users (adjust based on your needs)
-- For public access, use: CREATE POLICY "Allow all" ON accidents FOR ALL USING (true);
-- For authenticated only: CREATE POLICY "Allow authenticated" ON accidents FOR ALL USING (auth.role() = 'authenticated');

-- Example policy for public read/write (NOT recommended for production)
CREATE POLICY "Allow public access" ON accidents FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_accidents_updated_at
  BEFORE UPDATE ON accidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

