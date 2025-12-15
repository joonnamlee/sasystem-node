// 정산 관리 페이지 로직

// Supabase 초기화 대기
async function waitForSupabase() {
  let retryCount = 0;
  while (!window.supabaseClient && retryCount < 20) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retryCount++;
  }
  if (!window.supabaseClient) {
    throw new Error('Supabase client 초기화 실패');
  }
}

// Toast 메시지 표시
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `m-toast m-toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#EF4444' : type === 'success' ? '#22C55E' : '#3B6EF6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let currentRecords = [];
let selectedIds = [];

// 정산 리스트 로드
async function loadSettlementList() {
  try {
    await waitForSupabase();
    const supabase = window.supabaseClient;
    
    const month = document.getElementById('monthFilter').value;
    const workshop = document.getElementById('workshopFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    let query = supabase
      .from('accident_records')
      .select('*')
      .eq('is_deleted', false)
      .in('status', ['시공완료', '정산대기', '정산완료']);
    
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);
      query = query.gte('created_at', startDate.toISOString())
                   .lte('created_at', endDate.toISOString());
    }
    
    if (workshop) {
      query = query.eq('assigned_workshop_name', workshop);
    }
    
    if (status) {
      if (status === '미정산') {
        query = query.in('status', ['시공완료', '정산대기']);
      } else {
        query = query.eq('status', status);
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    currentRecords = data || [];
    renderSettlementList();
    
  } catch (error) {
    console.error('정산 리스트 로드 오류:', error);
    document.getElementById('settlementList').innerHTML = `
      <div class="m-empty-state">
        <div class="m-empty-state-text">데이터를 불러오는 중 오류가 발생했습니다.</div>
      </div>
    `;
  }
}

// 정산 리스트 렌더링
function renderSettlementList() {
  const container = document.getElementById('settlementList');
  
  if (!currentRecords || currentRecords.length === 0) {
    container.innerHTML = `
      <div class="m-empty-state">
        <div class="m-empty-state-icon">💰</div>
        <div class="m-empty-state-text">정산 대상이 없습니다.</div>
      </div>
    `;
    return;
  }
  
  const html = currentRecords.map(record => {
    const receiptNo = record.receipt_number || record.case_no || '-';
    const carModel = record.car_model || record.car_name || '-';
    const vehicleGrade = record.vehicle_grade || '중형';
    const laborCost = calculateLaborCost(vehicleGrade);
    const workshop = record.assigned_workshop_name || '-';
    const status = record.status || '시공완료';
    const isSettled = status === '정산완료';
    const recordId = record.id;
    
    let badgeClass = 'm-badge-warning';
    if (isSettled) badgeClass = 'm-badge-success';
    
    return `
      <div class="m-card">
        <div class="m-card-header">
          <div class="m-receipt-number">${receiptNo}</div>
          <span class="m-badge ${badgeClass}">${status}</span>
        </div>
        <div class="m-card-row">
          <span class="m-card-label">차량</span>
          <span class="m-card-value">${carModel} | ${vehicleGrade}</span>
        </div>
        <div class="m-card-row">
          <span class="m-card-label">공임</span>
          <span class="m-card-value">${laborCost.toLocaleString()}원</span>
        </div>
        <div class="m-card-row">
          <span class="m-card-label">시공점</span>
          <span class="m-card-value">${workshop}</span>
        </div>
        ${!isSettled ? `
        <div class="m-card-row" style="margin-top: 12px;">
          <label style="display: flex; align-items: center; cursor: pointer; width: 100%;">
            <input type="checkbox" value="${recordId}" onchange="updateSelection()" style="margin-right: 8px; width: 20px; height: 20px;">
            <span>선택</span>
          </label>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
}

// 공임 계산
function calculateLaborCost(grade) {
  const costs = {
    '소형': 70000,
    '중형': 80000,
    '대형': 90000
  };
  return costs[grade] || 80000;
}

// 선택 업데이트
function updateSelection() {
  selectedIds = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => cb.value);
}

// 선택 건 정산 완료
async function settleSelected() {
  if (selectedIds.length === 0) {
    showToast('정산할 항목을 선택해주세요.', 'error');
    return;
  }
  
  if (!confirm(`${selectedIds.length}건을 정산 완료 처리하시겠습니까?`)) {
    return;
  }
  
  try {
    await waitForSupabase();
    const supabase = window.supabaseClient;
    
    const { error } = await supabase
      .from('accident_records')
      .update({ status: '정산완료' })
      .in('id', selectedIds);
    
    if (error) throw error;
    
    showToast('정산이 완료되었습니다.', 'success');
    selectedIds = [];
    await loadSettlementList();
    
  } catch (error) {
    console.error('정산 처리 오류:', error);
    showToast('정산 처리 중 오류가 발생했습니다.', 'error');
  }
}

// 엑셀 다운로드
function downloadExcel() {
  if (!currentRecords || currentRecords.length === 0) {
    showToast('다운로드할 데이터가 없습니다.', 'error');
    return;
  }
  
  const excelData = currentRecords.map(record => ({
    '접수번호': record.receipt_number || record.case_no || '-',
    '차량': record.car_model || record.car_name || '-',
    '차급': record.vehicle_grade || '중형',
    '공임': calculateLaborCost(record.vehicle_grade || '중형'),
    '시공점': record.assigned_workshop_name || '-',
    '정산상태': record.status || '시공완료'
  }));
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  XLSX.utils.book_append_sheet(wb, ws, '정산');
  
  const today = new Date();
  const filename = `settlement_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
  
  XLSX.writeFile(wb, filename);
  showToast('엑셀 다운로드가 완료되었습니다.', 'success');
}

// 필터 변경 이벤트
document.addEventListener('DOMContentLoaded', async () => {
  // 월 필터 초기화
  const monthSelect = document.getElementById('monthFilter');
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (i === 0) option.selected = true;
    monthSelect.appendChild(option);
  }
  
  // 필터 변경 이벤트
  document.getElementById('monthFilter').addEventListener('change', loadSettlementList);
  document.getElementById('workshopFilter').addEventListener('change', loadSettlementList);
  document.getElementById('statusFilter').addEventListener('change', loadSettlementList);
  
  // 초기 로드
  await loadSettlementList();
});

