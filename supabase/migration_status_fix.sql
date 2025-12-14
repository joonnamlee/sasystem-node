-- 접수 현황 리스트 데이터 복구 마이그레이션
-- Supabase SQL Editor에서 실행

-- [1] status 값 전수 점검 및 마이그레이션
-- NULL, 빈 문자열, ENUM 외 값을 모두 '접수완료'로 변환

UPDATE public.accident_records 
SET status = CASE 
  -- 기존 ENUM 값은 그대로 유지
  WHEN status IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료') THEN status
  -- 기존 매핑 규칙
  WHEN status IN ('접수됨', 'RECEIVED', '신규', '신규접수') THEN '접수완료'
  WHEN status IN ('배정완료', 'ASSIGNED', '배정됨') THEN '배정완료'
  WHEN status IN ('시공예정', '작업중', 'IN_PROGRESS', '진행중') THEN '시공예정'
  WHEN status IN ('시공완료', '작업완료', 'COMPLETED', '완료') THEN '시공완료'
  WHEN status IN ('정산대기') THEN '정산대기'
  WHEN status IN ('정산완료', 'SETTLED') THEN '정산완료'
  WHEN status IN ('종료', 'CLOSED') THEN '종료'
  -- NULL, 빈 문자열, 기타 모든 값은 '접수완료'로 변환
  WHEN status IS NULL THEN '접수완료'
  WHEN status = '' THEN '접수완료'
  ELSE '접수완료'
END
WHERE is_deleted = false;

-- NULL 및 빈 문자열 명시적 처리
UPDATE public.accident_records 
SET status = '접수완료' 
WHERE is_deleted = false 
  AND (status IS NULL OR status = '');

-- [2] status_priority 컬럼 추가 및 값 설정
DO $$
BEGIN
  -- status_priority 컬럼 추가 (없는 경우)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'accident_records' AND column_name = 'status_priority') THEN
    ALTER TABLE public.accident_records 
    ADD COLUMN status_priority INTEGER DEFAULT 5;
  END IF;
END $$;

-- status_priority 값 설정
-- 정산대기(1) → 시공완료(2) → 시공예정(3) → 배정완료(4) → 접수완료(5) → 종료(6) → 정산완료(7)
UPDATE public.accident_records 
SET status_priority = CASE 
  WHEN status = '정산대기' THEN 1
  WHEN status = '시공완료' THEN 2
  WHEN status = '시공예정' THEN 3
  WHEN status = '배정완료' THEN 4
  WHEN status = '접수완료' THEN 5
  WHEN status = '종료' THEN 6
  WHEN status = '정산완료' THEN 7
  ELSE 5  -- 기본값: 접수완료
END
WHERE is_deleted = false;

-- status_priority 인덱스 추가 (정렬 성능 향상)
CREATE INDEX IF NOT EXISTS idx_accident_records_status_priority 
  ON public.accident_records(status_priority, created_at DESC) 
  WHERE is_deleted = false;

-- [3] 검증: ENUM 외 값이 없는지 확인
DO $$
DECLARE
  invalid_count INTEGER;
  null_count INTEGER;
  empty_count INTEGER;
BEGIN
  -- NULL 개수
  SELECT COUNT(*) INTO null_count
  FROM public.accident_records
  WHERE is_deleted = false AND status IS NULL;
  
  -- 빈 문자열 개수
  SELECT COUNT(*) INTO empty_count
  FROM public.accident_records
  WHERE is_deleted = false AND status = '';
  
  -- ENUM 외 값 개수
  SELECT COUNT(*) INTO invalid_count
  FROM public.accident_records
  WHERE is_deleted = false
    AND status IS NOT NULL
    AND status != ''
    AND status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료');
  
  IF null_count > 0 OR empty_count > 0 OR invalid_count > 0 THEN
    RAISE WARNING '⚠️ 문제가 있는 status 값이 발견되었습니다:';
    RAISE WARNING '  - NULL: %개', null_count;
    RAISE WARNING '  - 빈 문자열: %개', empty_count;
    RAISE WARNING '  - ENUM 외 값: %개', invalid_count;
  ELSE
    RAISE NOTICE '✅ 모든 status 값이 정상적으로 마이그레이션되었습니다.';
  END IF;
END $$;

-- [4] status_priority 값 검증
DO $$
DECLARE
  invalid_priority_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_priority_count
  FROM public.accident_records
  WHERE is_deleted = false
    AND (status_priority IS NULL OR status_priority NOT BETWEEN 1 AND 7);
  
  IF invalid_priority_count > 0 THEN
    RAISE WARNING '⚠️ status_priority 값이 잘못된 레코드가 %개 있습니다.', invalid_priority_count;
  ELSE
    RAISE NOTICE '✅ 모든 status_priority 값이 정상적으로 설정되었습니다.';
  END IF;
END $$;

