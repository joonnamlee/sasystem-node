# 담당자 관리 시스템 구현 완료 요약

## ✅ 구현 완료 사항

### 1️⃣ 세션 전달 방식 변경
- **dashboard.html**: Supabase 세션을 1회만 초기화하고 postMessage로 iframe에 전달
- **전달 데이터 구조**:
  ```javascript
  {
    type: "SESSION_INFO",
    user: {
      id: uuid,
      email: string,
      name: string (users.name 우선, 없으면 email),
      role: string
    }
  }
  ```

### 2️⃣ pages/accident/index.html 처리
- iframe 내부에서 `supabase.auth.getSession()` 호출 제거
- `window.addEventListener("message")`로 SESSION_INFO 수신
- 자동 입력 버튼 클릭 시 전달받은 `user.name`을 담당자 필드에 자동 입력
- 전달받은 `user.id`를 `managerId` 변수로 유지

### 3️⃣ 중복 선언 해결
- 전역 변수 단 1회만 선언:
  ```javascript
  let managerName = '';
  let managerId = null;
  let sessionUser = null; // postMessage로 받은 사용자 정보
  ```

### 4️⃣ 사고 저장 로직
- `accident_records` 테이블에 `manager_id(uuid)` 저장
- `manager_name`은 저장하지 않음 (JOIN으로 조회)

### 5️⃣ 담당자 변경 이력 로그
- `accident_manager_logs` 테이블에 기록
- 로그 필드:
  - `accident_id`
  - `from_manager_id`
  - `to_manager_id`
  - `changed_by` (현재 로그인 사용자 id)
  - `created_at`

### 6️⃣ 통계 기능
- `stats` 페이지에서 담당자별 처리 건수 집계
- `manager_id` 기준 GROUP BY
- `public.users`와 JOIN하여 이름 표시

### 7️⃣ 불필요한 코드 제거
- iframe 내부에서 중복 Supabase 초기화 제거
- 카카오 SDK script의 integrity 속성 제거

### 8️⃣ 안정성
- iframe reload, 페이지 이동 시에도 담당자 자동 입력 유지
- postMessage 기반으로 안정적인 세션 정보 전달

## 📋 SQL 마이그레이션

`supabase/migration_manager.sql` 파일을 Supabase SQL Editor에서 실행하세요:

```sql
-- 1. accident_records 테이블에 manager_id 컬럼 추가
ALTER TABLE public.accident_records
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id);

-- 2. accident_manager_logs 테이블 생성
CREATE TABLE IF NOT EXISTS public.accident_manager_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  accident_id UUID NOT NULL REFERENCES public.accident_records(id) ON DELETE CASCADE,
  from_manager_id UUID REFERENCES public.users(id),
  to_manager_id UUID REFERENCES public.users(id),
  changed_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_accident_records_manager_id 
  ON public.accident_records(manager_id);
  
CREATE INDEX IF NOT EXISTS idx_accident_manager_logs_accident_id 
  ON public.accident_manager_logs(accident_id);
  
CREATE INDEX IF NOT EXISTS idx_accident_manager_logs_created_at 
  ON public.accident_manager_logs(created_at DESC);
```

## 🔄 동작 흐름

1. **페이지 로드**:
   - dashboard.html에서 세션 확인
   - 세션 있으면 `public.users`에서 사용자 이름 조회
   - postMessage로 iframe에 전달

2. **iframe 수신**:
   - pages/accident/index.html에서 SESSION_INFO 수신
   - `sessionUser` 전역 변수에 저장
   - 담당자 필드 자동 입력

3. **자동 입력 버튼 클릭**:
   - 카카오톡 텍스트 파싱
   - 담당자 필드 자동 입력 (postMessage로 받은 정보 사용)

4. **사고 저장**:
   - `manager_id`와 `manager` 필드 저장
   - 담당자 변경 시 이력 로그 저장

## 📝 주요 변경 파일

1. **dashboard.html**
   - `sendSessionToIframe()` 함수 추가
   - iframe 로드 시 세션 정보 전달

2. **pages/accident/index.html**
   - postMessage 리스너 추가
   - `loadManagerName()` 함수를 postMessage 기반으로 변경
   - `getSession()` 호출 제거
   - 카카오 SDK integrity 속성 제거

3. **js/accidentApi.js**
   - `manager_name` 저장 제거
   - `manager_id`만 저장

4. **pages/stats/index.html**
   - 담당자별 통계에서 JOIN으로 이름 조회

5. **supabase/migration_manager.sql**
   - DB 스키마 마이그레이션 스크립트

