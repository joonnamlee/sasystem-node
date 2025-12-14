-- 상태 관리 v2 마이그레이션 스크립트
-- 새로운 상태 값: 접수완료, 배정완료, 시공예정, 시공완료, 정산대기, 정산완료, 종료
-- Supabase SQL Editor에서 실행

-- 1. accident_records 테이블에 status 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accident_records' AND column_name = 'status') THEN
    ALTER TABLE public.accident_records 
    ADD COLUMN status TEXT DEFAULT '접수완료';
  END IF;
END $$;

-- 2. 기존 레코드의 status를 새로운 상태 값으로 마이그레이션
-- ENUM 정의: 접수완료, 배정완료, 시공예정, 시공완료, 정산대기, 정산완료, 종료
-- 기존 상태 값 매핑:
-- '접수됨', 'RECEIVED', '신규', '신규접수' -> '접수완료'
-- '배정완료', 'ASSIGNED', '배정됨' -> '배정완료'
-- '작업중', 'IN_PROGRESS', '진행중' -> '시공예정'
-- '작업완료', 'COMPLETED', '완료' -> '시공완료'
-- '정산완료', 'SETTLED' -> '정산완료'
-- 기타 알 수 없는 값 -> '접수완료'
UPDATE public.accident_records 
SET status = CASE 
  WHEN status IN ('접수됨', 'RECEIVED', '신규', '신규접수', '접수완료') THEN '접수완료'
  WHEN status IN ('배정완료', 'ASSIGNED', '배정됨') THEN '배정완료'
  WHEN status IN ('시공예정', '작업중', 'IN_PROGRESS', '진행중') THEN '시공예정'
  WHEN status IN ('시공완료', '작업완료', 'COMPLETED', '완료') THEN '시공완료'
  WHEN status IN ('정산대기') THEN '정산대기'
  WHEN status IN ('정산완료', 'SETTLED') THEN '정산완료'
  WHEN status IN ('종료', 'CLOSED') THEN '종료'
  WHEN status IS NULL THEN '접수완료'
  ELSE '접수완료'  -- 알 수 없는 값은 모두 '접수완료'로 변환
END
WHERE status IS NOT NULL OR status IS NULL;

-- NULL인 경우 기본값 설정
UPDATE public.accident_records 
SET status = '접수완료' 
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

-- 5. ENUM 외 상태 값이 없는지 확인
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.accident_records
  WHERE is_deleted = false
    AND status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료');
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'ENUM 외 상태 값이 %개 발견되었습니다. 추가 마이그레이션이 필요합니다.', invalid_count;
    
    -- ENUM 외 상태 값 목록 출력
    RAISE NOTICE 'ENUM 외 상태 값 목록:';
    FOR rec IN 
      SELECT DISTINCT status 
      FROM public.accident_records 
      WHERE is_deleted = false
        AND status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료')
    LOOP
      RAISE NOTICE '  - %', rec.status;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ 모든 상태 값이 ENUM 정의와 일치합니다.';
  END IF;
END $$;

-- 6. 상태 값 체크 제약 조건 추가 (선택사항 - 데이터 무결성 보장)
-- 주의: 이 제약 조건을 추가하면 유효하지 않은 상태 값 입력을 방지할 수 있습니다.
-- 하지만 기존 데이터에 문제가 있을 수 있으므로 주의해서 사용하세요.
-- ALTER TABLE public.accident_records 
-- ADD CONSTRAINT check_status_values 
-- CHECK (status IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료'));

-- 6. RLS 정책 (필요시)
-- ALTER TABLE public.accident_status_logs ENABLE ROW LEVEL SECURITY;

