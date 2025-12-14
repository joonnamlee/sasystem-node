# 접수 현황 리스트 비어 보이는 문제 점검 체크리스트

## [1] 요약 카드 쿼리 vs 리스트 쿼리 비교

### 요약 카드 쿼리 조건:
- `is_deleted = false` ✅
- 오늘 접수: `incident_date >= 오늘 00:00 AND incident_date < 내일 00:00`
- 시공예정: `status = '시공예정'`
- 시공완료: `status = '시공완료'`
- 정산대기: `status = '정산대기'`
- 미종결: `status IN ('접수완료', '배정완료', '시공예정', '시공완료', '정산대기')`

### 리스트 쿼리 조건 (수정 전):
- `is_deleted = false` ✅
- 기본: `incident_date >= 최근 7일` (기본 조회 조건)
- 기본: `status != '종료'` (excludeClosed = true)
- 필터 적용 시: 사용자 선택 조건

### 차이점:
1. **기간 조건**: 요약 카드는 특정 날짜만, 리스트는 기본 최근 7일
2. **상태 조건**: 요약 카드는 특정 상태만, 리스트는 종료 제외
3. **필드명**: 둘 다 `incident_date` 사용 ✅

---

## [2] 리스트 기본 조회 조건 임시 제거 완료

### 수정 사항:
- `excludeClosed = false` (기본값 변경)
- `defaultLastDays = null` (기본값 변경)
- 기본 조회 조건 주석 처리

### 현재 상태:
- 조건 없이 전체 조회 가능
- `is_deleted = false` 조건만 적용

---

## [3] 실제 DB status 값 조회 함수 추가

### 추가된 함수:
- `checkDatabaseStatusValues()`: 브라우저 콘솔에서 실행 가능

### 확인 사항:
- DISTINCT status 값 목록 출력
- Status별 개수 출력
- ENUM 정의와 일치하지 않는 값 확인

### ENUM 정의:
```javascript
['접수완료', '배정완료', '시공예정', '시공완료', '정산대기', '정산완료', '종료']
```

---

## [4] 페이지네이션 offset 계산 점검

### 계산식:
```javascript
const from = (page - 1) * limit;
const to = from + limit - 1;
```

### 확인:
- page=1, limit=30: from=0, to=29 ✅ (0~29, 30개)
- page=2, limit=30: from=30, to=59 ✅ (30~59, 30개)
- **정상 계산됨**

---

## [5] 프론트엔드 추가 필터링 로직 확인

### 확인 결과:
- `renderTable()` 함수에서 `currentRecords`를 그대로 사용
- 추가 필터링 없음 ✅
- 서버 응답 데이터를 직접 렌더링

### 데이터 변환:
- 서버 응답 → `currentRecords` 변환 (필드명 정규화)
- 변환 과정에서 데이터 손실 없음 ✅

---

## [6] 디버깅 로그 추가

### 추가된 로그:
1. **API 함수 (`fetchAccidentRecordsPaginated`)**:
   - 쿼리 파라미터 로그
   - 쿼리 결과 로그 (data 개수, count, error)
   - 첫 번째 레코드 샘플

2. **프론트엔드 (`loadStatusList`)**:
   - 실제 DB status 값 확인
   - 로드된 데이터 확인 (개수, 샘플)

### 확인 방법:
- 브라우저 개발자 도구 콘솔에서 확인
- `checkDatabaseStatusValues()` 함수 수동 실행 가능

---

## 다음 단계: 단계적 복원

### 1단계: 조건 없음 (현재 상태)
- 전체 데이터 조회
- 데이터 표시 확인

### 2단계: 상태 필터 복원
- `excludeClosed = true` 복원
- 종료 상태 제외
- 데이터 유지 확인

### 3단계: 기간 필터 복원
- `defaultLastDays = 7` 복원
- 최근 7일만 조회
- 데이터 유지 확인

---

## 가능한 원인

1. **`incident_date` 필드가 NULL인 경우**
   - 날짜 필터 적용 시 NULL 레코드 제외됨
   - 해결: NULL 처리 추가 필요

2. **Status 값이 ENUM과 일치하지 않는 경우**
   - 필터 조건에서 제외됨
   - 해결: Status 값 마이그레이션 필요

3. **데이터가 실제로 없는 경우**
   - 요약 카드와 리스트 모두 0으로 표시
   - 해결: 데이터 확인 필요

4. **페이지네이션 문제**
   - offset 계산은 정상
   - Supabase range 쿼리 문제 가능성
   - 해결: 쿼리 결과 확인 필요

