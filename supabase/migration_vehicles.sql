-- Vehicles table migration
-- vehicles 테이블은 이미 존재함 (테이블 구조 변경 없음)

-- 1. Indexes 생성 (이미 존재하면 무시)
CREATE INDEX IF NOT EXISTS idx_vehicles_manufacturer ON vehicles(manufacturer);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_grade ON vehicles(grade);

-- 2. updated_at 자동 갱신용 Function (이미 존재하면 교체)
CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. updated_at 자동 갱신용 Trigger (이미 존재하면 제거 후 재생성)
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicles_updated_at();
