# 접수 현황 리스트 데이터 복구 작업 요약

## 완료된 작업

### [1] 상태 우선순위 ORDER BY 로직 제거 ✅
- **파일**: `js/accidentapi.js`
- **변경**: CASE WHEN 기반 정렬 제거, `created_at DESC`만 적용
- **상태**: 완료 (이미 적용됨)

### [2] status 값 전수 점검 및 마이그레이션 ✅
- **파일**: `supabase/migration_status_fix.sql` (신규 생성)
- **작업 내용**:
  - NULL, 빈 문자열, ENUM 외 값을 모두 '접수완료'로 변환
  - 기존 매핑 규칙 유지
  - 마이그레이션 후 검증 로직 포함

### [3] status_priority 컬럼 추가 및 정렬 구조 변경 ✅
- **파일**: `supabase/migration_status_fix.sql`, `js/accidentapi.js`
- **작업 내용**:
  - `status_priority` INTEGER 컬럼 추가
  - 상태별 우선순위 값 설정:
    - 정산대기: 1
    - 시공완료: 2
    - 시공예정: 3
    - 배정완료: 4
    - 접수완료: 5
    - 종료: 6
    - 정산완료: 7
  - 정렬: `status_priority ASC, created_at DESC`
  - 인덱스 추가: `(status_priority, created_at DESC)`

### [4] 기본 조회 조건 완화 ✅
- **파일**: `js/accidentapi.js`, `pages/status/index.html`
- **변경 사항**:
  - `defaultLastDays = null` (기간 제한 없음)
  - 기본 조회 조건에서 기간 제한 제거
  - `excludeClosed = false` (종료 상태 포함)

## 수정된 파일

1. **`supabase/migration_status_fix.sql`** (신규)
   - status 값 마이그레이션
   - status_priority 컬럼 추가 및 값 설정
   - 검증 로직

2. **`js/accidentapi.js`**
   - 기본 조회 조건 완화 (기간 제한 제거)
   - 정렬 로직 변경 (status_priority 사용)
   - status_priority 컬럼 select에 추가

3. **`pages/status/index.html`**
   - 기본 조회 조건 완화 (기간 제한 제거)

## 다음 단계

1. **마이그레이션 스크립트 실행**
   ```sql
   -- Supabase SQL Editor에서 실행
   -- supabase/migration_status_fix.sql 파일 내용 복사하여 실행
   ```

2. **검증**
   - 접수 현황 리스트에 데이터가 표시되는지 확인
   - status 값이 모두 ENUM 값인지 확인
   - status_priority 값이 올바르게 설정되었는지 확인
   - 정렬이 올바르게 작동하는지 확인 (정산대기 → 시공완료 → ... 순서)

3. **문제 발생 시**
   - 브라우저 콘솔에서 쿼리 파라미터 및 결과 로그 확인
   - `supabase/check_status_values.sql` 실행하여 status 값 확인

## 주의사항

1. **마이그레이션 실행 전**: 데이터 백업 권장
2. **status_priority 컬럼**: 새로 추가되는 컬럼이므로 기존 레코드에 값이 설정되어야 정렬이 정상 작동
3. **정렬 성능**: status_priority 인덱스가 추가되어 정렬 성능이 향상됨

