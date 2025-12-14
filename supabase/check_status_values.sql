-- accident_records 테이블의 status 값 확인 쿼리
-- Supabase SQL Editor에서 실행

-- [1] DISTINCT status 목록 및 개수
SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status IS NULL THEN 'NULL'
    WHEN status = '' THEN '빈 문자열'
    WHEN status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료') THEN 'ENUM 외 값'
    ELSE '정상'
  END as status_type
FROM public.accident_records
WHERE is_deleted = false
GROUP BY status
ORDER BY 
  CASE 
    WHEN status IS NULL THEN 1
    WHEN status = '' THEN 2
    WHEN status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료') THEN 3
    ELSE 4
  END,
  status;

-- [2] NULL / 빈 문자열 개수 확인
SELECT 
  'NULL' as type,
  COUNT(*) as count
FROM public.accident_records
WHERE is_deleted = false AND status IS NULL

UNION ALL

SELECT 
  '빈 문자열' as type,
  COUNT(*) as count
FROM public.accident_records
WHERE is_deleted = false AND status = ''

UNION ALL

SELECT 
  'ENUM 외 값' as type,
  COUNT(*) as count
FROM public.accident_records
WHERE is_deleted = false
  AND status IS NOT NULL
  AND status != ''
  AND status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료')

UNION ALL

SELECT 
  '정상 값' as type,
  COUNT(*) as count
FROM public.accident_records
WHERE is_deleted = false
  AND status IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료');

-- [3] ENUM 외 상태 값 상세 목록 (있는 경우)
SELECT 
  status,
  COUNT(*) as count,
  STRING_AGG(case_no, ', ' ORDER BY created_at DESC LIMIT 5) as sample_case_nos
FROM public.accident_records
WHERE is_deleted = false
  AND status IS NOT NULL
  AND status != ''
  AND status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료')
GROUP BY status
ORDER BY count DESC;

-- [4] 전체 통계 요약
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT status) as distinct_status_count,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as null_count,
  COUNT(CASE WHEN status = '' THEN 1 END) as empty_string_count,
  COUNT(CASE WHEN status NOT IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료') 
        AND status IS NOT NULL AND status != '' THEN 1 END) as invalid_status_count,
  COUNT(CASE WHEN status IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료') THEN 1 END) as valid_status_count
FROM public.accident_records
WHERE is_deleted = false;

