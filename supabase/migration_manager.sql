-- 담당자 관리 관련 마이그레이션 스크립트
-- Supabase SQL Editor에서 실행

-- 1. accident_records 테이블에 manager_id 컬럼 추가
ALTER TABLE public.accident_records
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id);

-- 2. accident_manager_logs 테이블 생성 (담당자 변경 이력)
DO $$
BEGIN
  -- 테이블이 없으면 생성
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'accident_manager_logs') THEN
    CREATE TABLE public.accident_manager_logs (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      accident_id UUID NOT NULL REFERENCES public.accident_records(id) ON DELETE CASCADE,
      from_manager_id UUID REFERENCES public.users(id),
      to_manager_id UUID REFERENCES public.users(id),
      changed_by UUID NOT NULL REFERENCES public.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- 테이블이 있으면 created_at 컬럼이 없으면 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'accident_manager_logs' 
                   AND column_name = 'created_at') THEN
      ALTER TABLE public.accident_manager_logs 
      ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_accident_records_manager_id 
  ON public.accident_records(manager_id);
  
CREATE INDEX IF NOT EXISTS idx_accident_manager_logs_accident_id 
  ON public.accident_manager_logs(accident_id);
  
CREATE INDEX IF NOT EXISTS idx_accident_manager_logs_created_at 
  ON public.accident_manager_logs(created_at DESC);

-- 4. RLS 정책 (필요시)
-- ALTER TABLE public.accident_manager_logs ENABLE ROW LEVEL SECURITY;

