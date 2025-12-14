-- 데이터베이스 인덱스 추가 마이그레이션 스크립트
-- 접수 현황 리스트 성능 최적화를 위한 인덱스
-- Supabase SQL Editor에서 실행

-- 1. incident_date 인덱스 (날짜 필터링 및 기본 조회 조건)
CREATE INDEX IF NOT EXISTS idx_accident_records_incident_date 
  ON public.accident_records(incident_date DESC);

-- 2. status 인덱스 (상태 필터링)
CREATE INDEX IF NOT EXISTS idx_accident_records_status 
  ON public.accident_records(status);

-- 3. insurer 인덱스 (보험사 필터링)
CREATE INDEX IF NOT EXISTS idx_accident_records_insurer 
  ON public.accident_records(insurer);

-- 4. assigned_workshop_name 인덱스 (시공점 필터링)
CREATE INDEX IF NOT EXISTS idx_accident_records_workshop_name 
  ON public.accident_records(assigned_workshop_name);

-- 5. car_no, car_number 인덱스 (차량번호 검색)
CREATE INDEX IF NOT EXISTS idx_accident_records_car_no 
  ON public.accident_records(car_no);

CREATE INDEX IF NOT EXISTS idx_accident_records_car_number 
  ON public.accident_records(car_number);

-- 6. 복합 인덱스 (자주 함께 사용되는 필터 조합)
-- 상태 + 날짜 (가장 자주 사용되는 조합)
CREATE INDEX IF NOT EXISTS idx_accident_records_status_date 
  ON public.accident_records(status, incident_date DESC);

-- is_deleted + incident_date (기본 조회 조건)
CREATE INDEX IF NOT EXISTS idx_accident_records_deleted_date 
  ON public.accident_records(is_deleted, incident_date DESC) 
  WHERE is_deleted = false;

-- 7. case_no, receipt_number 인덱스 (검색용, 이미 있을 수 있음)
CREATE INDEX IF NOT EXISTS idx_accident_records_case_no 
  ON public.accident_records(case_no);

CREATE INDEX IF NOT EXISTS idx_accident_records_receipt_number 
  ON public.accident_records(receipt_number);

-- 8. customer_name, phone 인덱스 (검색용)
CREATE INDEX IF NOT EXISTS idx_accident_records_customer_name 
  ON public.accident_records(customer_name);

CREATE INDEX IF NOT EXISTS idx_accident_records_phone 
  ON public.accident_records(phone);

-- 9. manager 인덱스 (담당자 필터링)
CREATE INDEX IF NOT EXISTS idx_accident_records_manager 
  ON public.accident_records(manager);

