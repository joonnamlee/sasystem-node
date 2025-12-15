// 접수 현황 페이지 로직

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

let currentRecords = [];

// KPI 카드 업데이트
async function updateKPICards() {
  try {
    await waitForSupabase();
    const supabase = window.supabaseClient;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 오늘 접수
    const { count: todayCount } = await supabase
      .from('accident_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .eq('is_deleted', false);
    
    // 진행중 (시공예정, 배정완료)
    const { count: inProgressCount } = await supabase
      .from('accident_records')
      .select('*', { count: 'exact', head: true })
      .in('status', ['시공예정', '배정완료'])
      .eq('is_deleted', false);
    
    // 완료 (시공완료)
    const { count: completedCount } = await supabase
      .from('accident_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', '시공완료')
      .eq('is_deleted', false);
    
    // 정산대기
    const { count: settlementCount } = await supabase
      .from('accident_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', '정산대기')
      .eq('is_deleted', false);
    
    document.getElementById('todayCount').textContent = todayCount || 0;
    document.getElementById('inProgressCount').textContent = inProgressCount || 0;
    document.getElementById('completedCount').textContent = completedCount || 0;
    document.getElementById('settlementCount').textContent = settlementCount || 0;
    
  } catch (error) {
    console.error('KPI 업데이트 오류:', error);
  }
}

// 접수 리스트 로드
async function loadReceiptList() {
  try {
    await waitForSupabase();
    const supabase = window.supabaseClient;
    
    const { data, error } = await supabase
      .from('accident_records')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    currentRecords = data || [];
    renderReceiptList();
    
  } catch (error) {
    console.error('접수 리스트 로드 오류:', error);
    document.getElementById('receiptList').innerHTML = `
      <div class="m-empty-state">
        <div class="m-empty-state-text">데이터를 불러오는 중 오류가 발생했습니다.</div>
      </div>
    `;
  }
}

// 접수 리스트 렌더링
function renderReceiptList() {
  const container = document.getElementById('receiptList');
  
  if (!currentRecords || currentRecords.length === 0) {
    container.innerHTML = `
      <div class="m-empty-state">
        <div class="m-empty-state-icon">📋</div>
        <div class="m-empty-state-text">접수된 기록이 없습니다.</div>
      </div>
    `;
    return;
  }
  
  const html = currentRecords.map(record => {
    const receiptNo = record.receipt_number || record.case_no || '-';
    const carModel = record.car_model || record.car_name || '-';
    const damageType = record.damage_type || '-';
    const address = record.accident_address || record.address || '-';
    const status = record.status || '접수완료';
    
    // 상태별 뱃지 클래스
    let badgeClass = 'm-badge-info';
    if (status === '시공완료') badgeClass = 'm-badge-success';
    else if (status === '정산대기') badgeClass = 'm-badge-warning';
    else if (status === '종료') badgeClass = 'm-badge-danger';
    
    return `
      <div class="m-receipt-card" onclick="openReceiptDetail('${receiptNo}')">
        <div class="m-receipt-card-header">
          <div class="m-receipt-number">${receiptNo}</div>
          <span class="m-badge ${badgeClass}">${status}</span>
        </div>
        <div class="m-card-row">
          <span class="m-card-label">차량</span>
          <span class="m-card-value">${carModel} | ${damageType}</span>
        </div>
        <div class="m-card-row">
          <span class="m-card-label">📍</span>
          <span class="m-card-value">${address}</span>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
}

// 접수 상세 열기
function openReceiptDetail(receiptNo) {
  window.location.href = `/pages/accident/index.html?receipt_number=${encodeURIComponent(receiptNo)}`;
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  await updateKPICards();
  await loadReceiptList();
  
  // 하단 탭 활성화
  updateBottomNavActive('status');
});

