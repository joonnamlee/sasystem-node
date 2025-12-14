/**
 * 상태 관리 통합 설정
 * 모든 상태 관련 상수, 매핑, 함수를 단일 파일로 관리
 */

// 상태 ENUM 정의 (단일화)
window.ACCIDENT_STATUS_ENUM = {
  RECEIVED: '접수완료',
  ASSIGNED: '배정완료',
  SCHEDULED: '시공예정',
  COMPLETED: '시공완료',
  PENDING_SETTLEMENT: '정산대기',
  SETTLED: '정산완료',
  CLOSED: '종료'
};

// 상태 목록 (배열)
window.ACCIDENT_STATUS_LIST = [
  '접수완료',
  '배정완료',
  '시공예정',
  '시공완료',
  '정산대기',
  '정산완료',
  '종료'
];

// 상태 우선순위 (정렬용)
window.ACCIDENT_STATUS_PRIORITY = {
  '정산대기': 1,
  '시공완료': 2,
  '시공예정': 3,
  '배정완료': 4,
  '접수완료': 5,
  '종료': 6,
  '정산완료': 7
};

// 상태 컬러 매핑 (고정)
window.ACCIDENT_STATUS_COLORS = {
  '접수완료': {
    background: '#e5e7eb',  // 회색
    color: '#374151',
    className: 'status-received'
  },
  '배정완료': {
    background: '#dbeafe',  // 파란색
    color: '#1e40af',
    className: 'status-assigned'
  },
  '시공예정': {
    background: '#e9d5ff',  // 보라색
    color: '#6b21a8',
    className: 'status-scheduled'
  },
  '시공완료': {
    background: '#d1fae5',  // 초록색
    color: '#065f46',
    className: 'status-completed'
  },
  '정산대기': {
    background: '#fed7aa',  // 주황색
    color: '#9a3412',
    className: 'status-pending'
  },
  '정산완료': {
    background: '#10b981',  // 진한 초록색
    color: '#ffffff',
    className: 'status-settled'
  },
  '종료': {
    background: '#d1d5db',  // 연회색
    color: '#4b5563',
    className: 'status-closed'
  }
};

// 상태별 CSS 클래스 반환
window.getStatusClass = function(status) {
  const normalizedStatus = normalizeStatus(status);
  return window.ACCIDENT_STATUS_COLORS[normalizedStatus]?.className || 'status-received';
};

// 상태 레이블 반환 (정규화된 상태 값 반환)
window.getStatusLabel = function(status) {
  const normalizedStatus = normalizeStatus(status);
  return normalizedStatus || '접수완료';
};

// 상태 정규화 (ENUM에 없는 값 → ENUM 값으로 변환)
window.normalizeStatus = function(status) {
  if (!status) return '접수완료';
  
  // 이미 ENUM 값이면 그대로 반환
  if (window.ACCIDENT_STATUS_LIST.includes(status)) {
    return status;
  }
  
  // 기존 값 → ENUM 값 매핑
  const statusMapping = {
    '접수됨': '접수완료',
    'RECEIVED': '접수완료',
    '신규': '접수완료',
    '신규접수': '접수완료',
    '배정됨': '배정완료',
    'ASSIGNED': '배정완료',
    '작업중': '시공예정',
    'IN_PROGRESS': '시공예정',
    '진행중': '시공예정',
    '작업완료': '시공완료',
    'COMPLETED': '시공완료',
    '완료': '시공완료',
    'SETTLED': '정산완료',
    'CLOSED': '종료'
  };
  
  return statusMapping[status] || '접수완료';
};

// 상태 뱃지 렌더링 (HTML)
window.renderStatusBadge = function(status, clickable = false) {
  const normalizedStatus = normalizeStatus(status);
  const statusConfig = window.ACCIDENT_STATUS_COLORS[normalizedStatus] || window.ACCIDENT_STATUS_COLORS['접수완료'];
  const statusText = normalizedStatus;
  const clickableClass = clickable ? 'clickable' : '';
  
  return `<span class="status-badge ${statusConfig.className} ${clickableClass}" style="background: ${statusConfig.background}; color: ${statusConfig.color};">${statusText}</span>`;
};

// 상태 우선순위 반환 (정렬용)
window.getStatusPriority = function(status) {
  const normalizedStatus = normalizeStatus(status);
  return window.ACCIDENT_STATUS_PRIORITY[normalizedStatus] || 99;
};

// 다음 상태 반환 (상태 변경용)
window.getNextStatus = function(currentStatus) {
  const normalizedStatus = normalizeStatus(currentStatus);
  const currentIndex = window.ACCIDENT_STATUS_LIST.indexOf(normalizedStatus);
  
  if (currentIndex === -1 || currentIndex >= window.ACCIDENT_STATUS_LIST.length - 1) {
    return null; // 다음 상태 없음
  }
  
  return window.ACCIDENT_STATUS_LIST[currentIndex + 1];
};

// 상태 변경 가능 여부 확인
window.canChangeStatus = function(fromStatus, toStatus) {
  const normalizedFrom = normalizeStatus(fromStatus);
  const normalizedTo = normalizeStatus(toStatus);
  
  const fromIndex = window.ACCIDENT_STATUS_LIST.indexOf(normalizedFrom);
  const toIndex = window.ACCIDENT_STATUS_LIST.indexOf(normalizedTo);
  
  // 다음 순서 상태로만 변경 가능
  return toIndex === fromIndex + 1;
};

