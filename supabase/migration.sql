-- Supabase migration script
-- Run this in your Supabase SQL editor

-- Table: accident_records
CREATE TABLE IF NOT EXISTS accident_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  phone TEXT,
  car_number TEXT,
  vin TEXT,
  insurance TEXT,
  vehicle_model TEXT,
  damage_location TEXT,
  request_detail TEXT,
  branch TEXT,
  status TEXT DEFAULT '신규',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for accident_records
CREATE INDEX IF NOT EXISTS idx_accident_receipt_number ON accident_records(receipt_number);
CREATE INDEX IF NOT EXISTS idx_accident_customer_name ON accident_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_accident_phone ON accident_records(phone);
CREATE INDEX IF NOT EXISTS idx_accident_car_number ON accident_records(car_number);
CREATE INDEX IF NOT EXISTS idx_accident_status ON accident_records(status);
CREATE INDEX IF NOT EXISTS idx_accident_created_at ON accident_records(created_at DESC);

-- Table: option_templates
CREATE TABLE IF NOT EXISTS option_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT UNIQUE NOT NULL,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for option_templates
CREATE INDEX IF NOT EXISTS idx_template_name ON option_templates(template_name);

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
ALTER TABLE accident_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_locations ENABLE ROW LEVEL SECURITY;

-- Policies: Allow public access (adjust based on your security needs)
CREATE POLICY "Allow public access accidents" ON accident_records FOR ALL USING (true);
CREATE POLICY "Allow public access templates" ON option_templates FOR ALL USING (true);
CREATE POLICY "Allow public access installers" ON installer_locations FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_accident_records_updated_at
  BEFORE UPDATE ON accident_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installer_locations_updated_at
  BEFORE UPDATE ON installer_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

