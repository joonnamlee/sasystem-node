# 상태 변경 시 status_priority 업데이트 적용 완료

## 수정된 파일

### [1] `js/accidentapi.js`
- **`updateAccidentStatus` 함수**: status 변경 시 status_priority도 함께 업데이트
- **`insertAccidentRecord` 함수**: 새 레코드 생성 시 status_priority 설정
- **`saveAccidentRecord` 함수**: 레코드 저장 시 status_priority 설정

### [2] `pages/status/index.html`
- **`confirmStatusChange` 함수**: 리스트에서 상태 변경 시 status_priority도 함께 업데이트

### [3] `pages/accident/index.html`
- **`handleStatusChange` 함수**: 상세 페이지에서 상태 변경 시 status_priority도 함께 업데이트

## 구현 방식

모든 상태 변경 로직에서 `statusConfig.js`의 `ACCIDENT_STATUS_PRIORITY`를 사용하여 status_priority 값을 계산합니다:

```javascript
const statusPriority = (window.ACCIDENT_STATUS_PRIORITY && window.ACCIDENT_STATUS_PRIORITY[newStatus]) || 5;
```

### 우선순위 매핑
- 정산대기: 1
- 시공완료: 2
- 시공예정: 3
- 배정완료: 4
- 접수완료: 5 (기본값)
- 종료: 6
- 정산완료: 7

## 적용 위치

1. **상태 변경 API 함수** (`updateAccidentStatus`)
   - 다른 코드에서 호출하는 공통 함수
   - status와 status_priority를 함께 업데이트

2. **리스트 페이지 상태 변경** (`pages/status/index.html`)
   - 빠른 상태 변경 팝업에서 상태 변경 시
   - status와 status_priority를 함께 업데이트

3. **상세 페이지 상태 변경** (`pages/accident/index.html`)
   - 상세 페이지에서 상태 드롭다운 변경 시
   - status와 status_priority를 함께 업데이트

4. **새 레코드 생성/저장** (`insertAccidentRecord`, `saveAccidentRecord`)
   - 새 사고 등록 시 기본 status_priority 설정
   - 레코드 저장 시 status_priority 설정

## 효과

- ✅ 상태 변경 시 항상 status_priority가 함께 업데이트됨
- ✅ NULL priority 문제 방지
- ✅ 정렬이 항상 올바르게 작동
- ✅ 새 레코드 생성 시에도 status_priority 자동 설정

## 주의사항

- `statusConfig.js`가 먼저 로드되어야 `ACCIDENT_STATUS_PRIORITY`를 사용할 수 있습니다.
- 모든 상태 변경 로직이 이 패턴을 따르도록 유지해야 합니다.
- 향후 새로운 상태 변경 로직 추가 시에도 status_priority 업데이트를 포함해야 합니다.

