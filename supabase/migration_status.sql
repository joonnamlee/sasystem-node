-- 상태 관리 관련 마이그레이션 스크립트
-- Supabase SQL Editor에서 실행

-- 1. accident_records 테이블에 status 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accident_records' AND column_name = 'status') THEN
    ALTER TABLE public.accident_records 
    ADD COLUMN status TEXT DEFAULT 'RECEIVED';
  END IF;
END $$;

-- 2. 기존 레코드의 status를 기본값으로 설정 (NULL인 경우)
UPDATE public.accident_records 
SET status = 'RECEIVED' 
WHERE status IS NULL;

-- 3. accident_status_logs 테이블 생성 (상태 변경 이력)
CREATE TABLE IF NOT EXISTS public.accident_status_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_no TEXT NOT NULL,
  before_status TEXT,
  after_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_accident_status_logs_case_no 
  ON public.accident_status_logs(case_no);
  
CREATE INDEX IF NOT EXISTS idx_accident_status_logs_created_at 
  ON public.accident_status_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_accident_records_status 
  ON public.accident_records(status);

-- 5. RLS 정책 (필요시)
-- ALTER TABLE public.accident_status_logs ENABLE ROW LEVEL SECURITY;

