-- message_templates 테이블의 type 컬럼 실제 값 확인
-- Supabase SQL Editor에서 실행

-- [1] DISTINCT type 값 목록 및 개수
SELECT 
    type, 
    COUNT(*) AS count,
    MAX(updated_at) AS latest_updated
FROM public.message_templates
GROUP BY type
ORDER BY type;

-- [2] 전체 레코드 확인
SELECT 
    id,
    type,
    LENGTH(content) AS content_length,
    updated_at
FROM public.message_templates
ORDER BY updated_at DESC;

-- [3] type 값 통계
SELECT
    COUNT(DISTINCT type) AS unique_types,
    COUNT(*) AS total_records,
    ARRAY_AGG(DISTINCT type) AS type_list
FROM public.message_templates;

