// 정산관리 페이지 로직

let currentTab = 1;
let detailRecords = [];
let workshopAggregates = [];
let monthlyAggregates = [];
let selectedRecords = new Set();
let selectedWorkshops = new Set();
let pendingSettleAction = null;

// 공임 단가 설정 (기본값)
let laborCosts = {
  소형: 50000,
  중형: 70000,
  대형: 90000
};

// Supabase 클라이언트 대기
function waitForSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient && window.supabaseReady) {
      resolve();
      return;
    }
    
    window.addEventListener('supabaseReady', () => {
      resolve();
    }, { once: true });
    
    setTimeout(() => {
      if (window.supabaseClient) {
        resolve();
      } else {
        console.warn('Supabase client not ready after timeout');
        resolve();
      }
    }, 2000);
  });
}

// 에러 처리
function checkError(error) {
  if (error) {
    console.error("Supabase error:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    throw error;
  }
}

// 사고일 컬럼 가져오기 (우선순위: accident_date > accident_at > created_at)
function getAccidentDateColumn(record) {
  if (record.accident_date) return record.accident_date;
  if (record.accident_at) return record.accident_at;
  if (record.created_at) return record.created_at;
  return null;
}

// 사고일 포맷팅 (YYYY-MM-DD)
function formatAccidentDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return dateStr;
  }
}

// 월 필터링 (클라이언트 사이드)
function filterByMonth(records, month) {
  if (!month) return records;
  
  return records.filter(record => {
    const accidentDate = getAccidentDateColumn(record);
    if (!accidentDate) return false;
    
    try {
      const date = new Date(accidentDate);
      const recordMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return recordMonth === month;
    } catch (e) {
      return false;
    }
  });
}

// HTML 이스케이프
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 금액 포맷팅
function formatAmount(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount || 0) + '원';
}


// 공임 단가 로드 (로컬 스토리지)
function loadLaborCosts() {
  const saved = localStorage.getItem('settlement_labor_costs');
  if (saved) {
    try {
      laborCosts = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load labor costs from localStorage');
    }
  }
  document.getElementById('laborCostSmall').value = laborCosts.소형;
  document.getElementById('laborCostMedium').value = laborCosts.중형;
  document.getElementById('laborCostLarge').value = laborCosts.대형;
}

// 공임 단가 저장
function saveLaborCosts() {
  laborCosts.소형 = parseInt(document.getElementById('laborCostSmall').value) || 50000;
  laborCosts.중형 = parseInt(document.getElementById('laborCostMedium').value) || 70000;
  laborCosts.대형 = parseInt(document.getElementById('laborCostLarge').value) || 90000;
  localStorage.setItem('settlement_labor_costs', JSON.stringify(laborCosts));
  loadData();
}

// 공임 계산 (차급 기준)
function calculateLaborCost(grade) {
  return laborCosts[grade] || 0;
}

// 차급 가져오기 (vehicle_id 또는 car_model 기준)
async function getVehicleGrade(vehicleId, carModel) {
  if (!window.supabaseClient) return null;
  
  // vehicle_id가 있으면 vehicles 테이블에서 조회
  if (vehicleId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('vehicles')
        .select('grade')
        .eq('id', vehicleId)
        .single();
      
      if (!error && data && data.grade) {
        return data.grade;
      }
    } catch (e) {
      console.warn('Failed to get vehicle grade from vehicles table:', e);
    }
  }
  
  // car_model에서 차급 추출 시도 (예: "소형차", "중형차" 등)
  if (carModel) {
    const model = carModel.toLowerCase();
    if (model.includes('소형') || model.includes('small')) return '소형';
    if (model.includes('중형') || model.includes('medium')) return '중형';
    if (model.includes('대형') || model.includes('large')) return '대형';
  }
  
  return null;
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();
  
  // 기본값 설정
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('filterMonth').value = `${year}-${month}`;
  document.getElementById('filterStatus').value = 'pending';
  
  loadLaborCosts();
  loadWorkshops();
  loadData();
});

// 시공점 목록 로드
async function loadWorkshops() {
  await waitForSupabase();
  
  if (!window.supabaseClient) return;
  
  try {
    const { data, error } = await window.supabaseClient
      .from('installer_locations')
      .select('name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    checkError(error);
    
    const select = document.getElementById('filterWorkshop');
    select.innerHTML = '<option value="">전체</option>';
    
    if (data && data.length > 0) {
      data.forEach(workshop => {
        const option = document.createElement('option');
        option.value = workshop.name;
        option.textContent = workshop.name;
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error('Failed to load workshops:', e);
  }
}

// 탭 전환
function switchTab(tabNumber) {
  currentTab = tabNumber;
  
  // 탭 버튼 활성화
  document.querySelectorAll('.tab').forEach((tab, index) => {
    if (index + 1 === tabNumber) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // 탭 컨텐츠 표시
  document.querySelectorAll('.tab-content').forEach((content, index) => {
    if (index + 1 === tabNumber) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // 모바일 고정 버튼 표시/숨김
  updateMobileFixedActions();
  
  loadData();
}

// 페이지 로드 시 모바일 버튼 초기화
window.addEventListener('DOMContentLoaded', () => {
  updateMobileFixedActions();
});

// 모바일 고정 버튼 업데이트
function updateMobileFixedActions() {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;
  
  // 모든 고정 버튼 숨기기
  document.querySelectorAll('.m-fixed-actions').forEach(el => {
    el.style.display = 'none';
  });
  
  // 현재 탭의 고정 버튼 표시
  const fixedActions = document.getElementById(`mFixedActionsTab${currentTab}`);
  if (fixedActions) {
    fixedActions.style.display = 'flex';
  }
}

// 윈도우 리사이즈 시 모바일 버튼 업데이트
window.addEventListener('resize', () => {
  updateMobileFixedActions();
});

// 데이터 로드 (현재 탭에 맞게)
async function loadData() {
  if (currentTab === 1) {
    await loadDetailRecords();
  } else if (currentTab === 2) {
    await loadWorkshopAggregates();
  } else if (currentTab === 3) {
    await loadMonthlyAggregates();
  }
}

// 탭 1: 수리 건별 상세 로드
async function loadDetailRecords() {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    document.getElementById('detailTableBody').innerHTML = 
      '<tr><td colspan="13" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
    return;
  }
  
  try {
    const month = document.getElementById('filterMonth').value;
    const workshop = document.getElementById('filterWorkshop').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    if (!month) {
      document.getElementById('detailTableBody').innerHTML = 
        '<tr><td colspan="13" style="text-align: center; padding: 40px; color: #9ca3af;">정산 월을 선택해주세요.</td></tr>';
      return;
    }
    
    // 정산 대상: status가 '시공완료' 또는 '정산대기' 또는 '정산완료'
    let query = window.supabaseClient
      .from('accident_records')
      .select('*')
      .in('status', ['시공완료', '정산대기', '정산완료']);
    
    if (workshop) {
      query = query.eq('assigned_workshop_name', workshop);
    }
    
    if (statusFilter === 'pending') {
      query = query.in('status', ['시공완료', '정산대기']);
    } else if (statusFilter === 'settled') {
      query = query.eq('status', '정산완료');
    }
    
    // 정렬: 사고일 기준 (우선순위: accident_date > accident_at > created_at)
    // Supabase에서는 동적 컬럼 정렬이 어려우므로 클라이언트 사이드에서 정렬
    const { data, error } = await query;
    
    if (error) {
      console.error('Failed to load detail records - Full error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      document.getElementById('detailTableBody').innerHTML = 
        '<tr><td colspan="13" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
      return;
    }
    
    let records = data || [];
    
    // 월 필터링 (클라이언트 사이드)
    records = filterByMonth(records, month);
    
    // 정렬: 사고일 기준 내림차순
    records.sort((a, b) => {
      const dateA = getAccidentDateColumn(a);
      const dateB = getAccidentDateColumn(b);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB) - new Date(dateA);
    });
    
    detailRecords = records;
    
    // 차급 및 공임 계산
    for (const record of detailRecords) {
      // vehicle_id가 있으면 vehicles 테이블에서 조회, 없으면 car_model에서 추정
      record.vehicle_grade = await getVehicleGrade(record.vehicle_id, record.car_model);
      record.labor_cost = calculateLaborCost(record.vehicle_grade);
    }
    
    renderDetailRecords();
  } catch (e) {
    console.error('Failed to load detail records:', e);
    console.error('Error stack:', e.stack);
    document.getElementById('detailTableBody').innerHTML = 
      '<tr><td colspan="13" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
  }
}

// 탭 1: 수리 건별 상세 렌더링
function renderDetailRecords() {
  const tbody = document.getElementById('detailTableBody');
  const cardList = document.getElementById('mDetailCardList');
  
  if (detailRecords.length === 0) {
    tbody.innerHTML = 
      '<tr><td colspan="13" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 건이 없습니다.</td></tr>';
    if (cardList) {
      cardList.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 건이 없습니다.</div>';
    }
    return;
  }
  
  // 데스크톱 테이블 렌더링
  tbody.innerHTML = detailRecords.map((record, index) => {
    const isSelected = selectedRecords.has(record.id);
    const isSettled = record.status === '정산완료';
    const gradeBadge = record.vehicle_grade 
      ? `<span class="badge badge-class-${record.vehicle_grade === '소형' ? 'small' : record.vehicle_grade === '중형' ? 'medium' : 'large'}">${escapeHtml(record.vehicle_grade)}</span>`
      : '<span style="color: #9ca3af;">-</span>';
    
    const statusBadge = isSettled
      ? '<span class="badge badge-settled">정산완료</span>'
      : '<span class="badge badge-pending">미정산</span>';
    
    return `
      <tr class="${isSettled ? 'settled' : ''} ${isSelected ? 'selected' : ''}" data-record-id="${record.id}">
        <td>
          ${isSettled ? '' : `<input type="checkbox" class="record-checkbox" data-id="${record.id}" onchange="toggleRecord(${index})" ${isSelected ? 'checked' : ''} />`}
        </td>
        <td>${escapeHtml(record.receipt_number || record.case_no || '')}</td>
        <td>${escapeHtml(record.customer_name || '')}</td>
        <td>${escapeHtml(record.car_number || record.car_no || '')}</td>
        <td>${escapeHtml(record.car_model || '')}</td>
        <td>${gradeBadge}</td>
        <td>${escapeHtml(record.damage_type || '')}</td>
        <td>${escapeHtml(record.deductible || '')}</td>
        <td>${escapeHtml(record.deductible_type || record.deductible_pay_type || '')}</td>
        <td class="amount">${formatAmount(record.labor_cost)}</td>
        <td>${escapeHtml(record.assigned_workshop_name || '')}</td>
        <td>${formatAccidentDate(getAccidentDateColumn(record))}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
  
  // 모바일 카드 리스트 렌더링
  if (cardList) {
    cardList.innerHTML = detailRecords.map((record, index) => {
      const isSelected = selectedRecords.has(record.id);
      const isSettled = record.status === '정산완료';
      const gradeBadge = record.vehicle_grade 
        ? `<span class="badge badge-class-${record.vehicle_grade === '소형' ? 'small' : record.vehicle_grade === '중형' ? 'medium' : 'large'}">${escapeHtml(record.vehicle_grade)}</span>`
        : '<span style="color: #9ca3af;">-</span>';
      
      const statusBadge = isSettled
        ? '<span class="badge badge-settled">정산완료</span>'
        : '<span class="badge badge-pending">미정산</span>';
      
      return `
        <div class="m-card-item ${isSettled ? 'settled' : ''} ${isSelected ? 'selected' : ''}" data-record-id="${record.id}">
          <div class="m-card-header">
            ${isSettled ? '' : `<input type="checkbox" class="record-checkbox" data-id="${record.id}" onchange="toggleRecord(${index})" ${isSelected ? 'checked' : ''} style="margin-right: 8px;" />`}
            ${escapeHtml(record.receipt_number || record.case_no || '')}
          </div>
          <div class="m-card-row">
            <span class="m-card-label">고객명</span>
            <span class="m-card-value">${escapeHtml(record.customer_name || '')}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">차량번호</span>
            <span class="m-card-value">${escapeHtml(record.car_number || record.car_no || '')}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">차명</span>
            <span class="m-card-value">${escapeHtml(record.car_model || '')}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">차급</span>
            <span class="m-card-value">${gradeBadge}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">공임</span>
            <span class="m-card-value amount">${formatAmount(record.labor_cost)}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">시공점</span>
            <span class="m-card-value">${escapeHtml(record.assigned_workshop_name || '')}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">정산상태</span>
            <span class="m-card-value">${statusBadge}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  updateSelectedCount();
}

// 탭 2: 시공점별 월 집계 로드
async function loadWorkshopAggregates() {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    document.getElementById('workshopTableBody').innerHTML = 
      '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
    return;
  }
  
  try {
    const month = document.getElementById('filterMonth').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    if (!month) {
      document.getElementById('workshopTableBody').innerHTML = 
        '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #9ca3af;">정산 월을 선택해주세요.</td></tr>';
      return;
    }
    
    // 먼저 상세 데이터 로드
    let query = window.supabaseClient
      .from('accident_records')
      .select('*')
      .in('status', ['시공완료', '정산대기', '정산완료'])
      .not('assigned_workshop_name', 'is', null);
    
    if (statusFilter === 'pending') {
      query = query.in('status', ['시공완료', '정산대기']);
    } else if (statusFilter === 'settled') {
      query = query.eq('status', '정산완료');
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Failed to load workshop aggregates - Full error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      document.getElementById('workshopTableBody').innerHTML = 
        '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
      return;
    }
    
    let records = data || [];
    
    // 월 필터링 (클라이언트 사이드)
    records = filterByMonth(records, month);
    
    // 차급 및 공임 계산
    for (const record of records) {
      record.vehicle_grade = await getVehicleGrade(record.vehicle_id, record.car_model);
      record.labor_cost = calculateLaborCost(record.vehicle_grade);
    }
    
    // 시공점별 집계
    const aggregates = {};
    
    records.forEach(record => {
      const workshop = record.assigned_workshop_name;
      if (!workshop) return;
      
      if (!aggregates[workshop]) {
        aggregates[workshop] = {
          workshop_name: workshop,
          small_count: 0,
          medium_count: 0,
          large_count: 0,
          total_count: 0,
          total_amount: 0,
          status: '미정산',
          records: []
        };
      }
      
      aggregates[workshop].records.push(record);
      aggregates[workshop].total_count++;
      aggregates[workshop].total_amount += record.labor_cost || 0;
      
      if (record.vehicle_grade === '소형') {
        aggregates[workshop].small_count++;
      } else if (record.vehicle_grade === '중형') {
        aggregates[workshop].medium_count++;
      } else if (record.vehicle_grade === '대형') {
        aggregates[workshop].large_count++;
      }
      
      // 정산 상태 확인 (모든 건이 정산완료면 정산완료)
      if (record.status === '정산완료') {
        const allSettled = aggregates[workshop].records.every(r => r.status === '정산완료');
        if (allSettled) {
          aggregates[workshop].status = '정산완료';
        } else {
          aggregates[workshop].status = '부분정산';
        }
      }
    });
    
    workshopAggregates = Object.values(aggregates);
    renderWorkshopAggregates();
  } catch (e) {
    console.error('Failed to load workshop aggregates:', e);
    console.error('Error stack:', e.stack);
    document.getElementById('workshopTableBody').innerHTML = 
      '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
  }
}

// 탭 2: 시공점별 월 집계 렌더링
function renderWorkshopAggregates() {
  const tbody = document.getElementById('workshopTableBody');
  const cardList = document.getElementById('mWorkshopCardList');
  
  if (workshopAggregates.length === 0) {
    tbody.innerHTML = 
      '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #9ca3af;">집계 데이터가 없습니다.</td></tr>';
    if (cardList) {
      cardList.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">집계 데이터가 없습니다.</div>';
    }
    return;
  }
  
  // 데스크톱 테이블 렌더링
  tbody.innerHTML = workshopAggregates.map((agg, index) => {
    const isSelected = selectedWorkshops.has(agg.workshop_name);
    const isSettled = agg.status === '정산완료';
    const statusBadge = isSettled
      ? '<span class="badge badge-settled">정산완료</span>'
      : agg.status === '부분정산'
      ? '<span class="badge badge-pending">부분정산</span>'
      : '<span class="badge badge-pending">미정산</span>';
    
    return `
      <tr class="${isSettled ? 'settled' : ''} ${isSelected ? 'selected' : ''}" 
          data-workshop="${escapeHtml(agg.workshop_name)}" 
          onclick="drillDownWorkshop('${escapeHtml(agg.workshop_name)}')"
          style="cursor: pointer;">
        <td onclick="event.stopPropagation();">
          ${isSettled ? '' : `<input type="checkbox" class="workshop-checkbox" data-workshop="${escapeHtml(agg.workshop_name)}" onchange="toggleWorkshop(${index})" ${isSelected ? 'checked' : ''} />`}
        </td>
        <td>${escapeHtml(agg.workshop_name)}</td>
        <td>${agg.small_count}</td>
        <td>${agg.medium_count}</td>
        <td>${agg.large_count}</td>
        <td>${agg.total_count}</td>
        <td class="amount">${formatAmount(agg.total_amount)}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
  
  // 모바일 카드 리스트 렌더링
  if (cardList) {
    cardList.innerHTML = workshopAggregates.map((agg, index) => {
      const isSelected = selectedWorkshops.has(agg.workshop_name);
      const isSettled = agg.status === '정산완료';
      const statusBadge = isSettled
        ? '<span class="badge badge-settled">정산완료</span>'
        : agg.status === '부분정산'
        ? '<span class="badge badge-pending">부분정산</span>'
        : '<span class="badge badge-pending">미정산</span>';
      
      return `
        <div class="m-card-item ${isSettled ? 'settled' : ''} ${isSelected ? 'selected' : ''}" 
             data-workshop="${escapeHtml(agg.workshop_name)}" 
             onclick="drillDownWorkshop('${escapeHtml(agg.workshop_name)}')"
             style="cursor: pointer;">
          <div class="m-card-header">
            ${isSettled ? '' : `<input type="checkbox" class="workshop-checkbox" data-workshop="${escapeHtml(agg.workshop_name)}" onchange="toggleWorkshop(${index}); event.stopPropagation();" ${isSelected ? 'checked' : ''} style="margin-right: 8px;" />`}
            ${escapeHtml(agg.workshop_name)}
          </div>
          <div class="m-card-row">
            <span class="m-card-label">소형</span>
            <span class="m-card-value">${agg.small_count}건</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">중형</span>
            <span class="m-card-value">${agg.medium_count}건</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">대형</span>
            <span class="m-card-value">${agg.large_count}건</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">총 작업건</span>
            <span class="m-card-value">${agg.total_count}건</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">총 공임</span>
            <span class="m-card-value amount">${formatAmount(agg.total_amount)}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">정산상태</span>
            <span class="m-card-value">${statusBadge}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  updateMobileFixedActions();
}

// 탭 3: 전체 월 집계 로드
async function loadMonthlyAggregates() {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    document.getElementById('monthlyTableBody').innerHTML = 
      '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
    return;
  }
  
  try {
    const month = document.getElementById('filterMonth').value;
    
    if (!month) {
      document.getElementById('monthlyTableBody').innerHTML = 
        '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">정산 월을 선택해주세요.</td></tr>';
      return;
    }
    
    // 먼저 상세 데이터 로드
    let query = window.supabaseClient
      .from('accident_records')
      .select('*')
      .in('status', ['시공완료', '정산대기', '정산완료']);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Failed to load monthly aggregates - Full error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      document.getElementById('monthlyTableBody').innerHTML = 
        '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
      return;
    }
    
    let records = data || [];
    
    // 월 필터링 (클라이언트 사이드)
    records = filterByMonth(records, month);
    
    // 차급 및 공임 계산
    for (const record of records) {
      record.vehicle_grade = await getVehicleGrade(record.vehicle_id, record.car_model);
      record.labor_cost = calculateLaborCost(record.vehicle_grade);
    }
    
    // 전체 집계
    const aggregate = {
      month: month,
      small_count: 0,
      medium_count: 0,
      large_count: 0,
      total_count: records.length,
      total_amount: 0,
      workshop_count: new Set()
    };
    
    records.forEach(record => {
      if (record.vehicle_grade === '소형') {
        aggregate.small_count++;
      } else if (record.vehicle_grade === '중형') {
        aggregate.medium_count++;
      } else if (record.vehicle_grade === '대형') {
        aggregate.large_count++;
      }
      
      aggregate.total_amount += record.labor_cost || 0;
      
      if (record.assigned_workshop_name) {
        aggregate.workshop_count.add(record.assigned_workshop_name);
      }
    });
    
    monthlyAggregates = [aggregate];
    
    // 요약 카드 업데이트
    document.getElementById('totalWorkshops').textContent = aggregate.workshop_count.size;
    document.getElementById('totalCases').textContent = aggregate.total_count;
    document.getElementById('totalAmount').textContent = formatAmount(aggregate.total_amount);
    
    renderMonthlyAggregates();
  } catch (e) {
    console.error('Failed to load monthly aggregates:', e);
    console.error('Error stack:', e.stack);
    document.getElementById('monthlyTableBody').innerHTML = 
      '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">정산 대상 데이터 없음</td></tr>';
  }
}

// 탭 3: 전체 월 집계 렌더링
function renderMonthlyAggregates() {
  const tbody = document.getElementById('monthlyTableBody');
  
  if (monthlyAggregates.length === 0) {
    tbody.innerHTML = 
      '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">집계 데이터가 없습니다.</td></tr>';
    updateMobileFixedActions();
    return;
  }
  
  tbody.innerHTML = monthlyAggregates.map(agg => {
    return `
      <tr>
        <td>${agg.month}</td>
        <td>${agg.small_count}</td>
        <td>${agg.medium_count}</td>
        <td>${agg.large_count}</td>
        <td>${agg.total_count}</td>
        <td class="amount">${formatAmount(agg.total_amount)}</td>
      </tr>
    `;
  }).join('');
  
  updateMobileFixedActions();
}

// 체크박스 토글 함수들
function toggleSelectAll() {
  const checked = document.getElementById('selectAll').checked;
  selectedRecords.clear();
  
  if (checked) {
    detailRecords.forEach(record => {
      if (record.status !== '정산완료') {
        selectedRecords.add(record.id);
      }
    });
  }
  
  document.querySelectorAll('.record-checkbox').forEach(cb => {
    cb.checked = checked && detailRecords.find(r => r.id === cb.dataset.id)?.status !== '정산완료';
  });
  
  updateSelectedCount();
}

function toggleRecord(index) {
  const record = detailRecords[index];
  if (record.status === '정산완료') return;
  
  if (selectedRecords.has(record.id)) {
    selectedRecords.delete(record.id);
  } else {
    selectedRecords.add(record.id);
  }
  
  updateSelectedCount();
}

function toggleSelectAllWorkshop() {
  const checked = document.getElementById('selectAllWorkshop').checked;
  selectedWorkshops.clear();
  
  if (checked) {
    workshopAggregates.forEach(agg => {
      if (agg.status !== '정산완료') {
        selectedWorkshops.add(agg.workshop_name);
      }
    });
  }
  
  document.querySelectorAll('.workshop-checkbox').forEach(cb => {
    cb.checked = checked && workshopAggregates.find(a => a.workshop_name === cb.dataset.workshop)?.status !== '정산완료';
  });
}

function toggleWorkshop(index) {
  const agg = workshopAggregates[index];
  if (agg.status === '정산완료') return;
  
  if (selectedWorkshops.has(agg.workshop_name)) {
    selectedWorkshops.delete(agg.workshop_name);
  } else {
    selectedWorkshops.add(agg.workshop_name);
  }
}

function updateSelectedCount() {
  document.getElementById('selectedCount').textContent = `선택된 건: ${selectedRecords.size}개`;
}

// 시공점 드릴다운
function drillDownWorkshop(workshopName) {
  document.getElementById('filterWorkshop').value = workshopName;
  switchTab(1);
  loadData();
}

// 선택 건 정산 완료
function settleSelected() {
  if (selectedRecords.size === 0) {
    alert('정산할 건을 선택해주세요.');
    return;
  }
  
  pendingSettleAction = {
    type: 'records',
    ids: Array.from(selectedRecords)
  };
  
  document.getElementById('settleModalMessage').textContent = 
    `선택한 ${selectedRecords.size}개 건을 정산 완료 처리하시겠습니까?`;
  document.getElementById('settleModal').classList.add('active');
}

// 시공점별 정산 완료
function settleWorkshopMonth() {
  if (selectedWorkshops.size === 0) {
    alert('정산할 시공점을 선택해주세요.');
    return;
  }
  
  const month = document.getElementById('filterMonth').value;
  if (!month) {
    alert('정산 월을 선택해주세요.');
    return;
  }
  
  pendingSettleAction = {
    type: 'workshop',
    workshops: Array.from(selectedWorkshops),
    month: month
  };
  
  document.getElementById('settleModalMessage').textContent = 
    `선택한 ${selectedWorkshops.size}개 시공점의 ${month}월 정산을 완료 처리하시겠습니까?`;
  document.getElementById('settleModal').classList.add('active');
}

// 정산 완료 확인
async function confirmSettle() {
  if (!pendingSettleAction) return;
  
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    alert('데이터베이스 연결에 실패했습니다.');
    return;
  }
  
  try {
    if (pendingSettleAction.type === 'records') {
      // 선택한 건들을 정산완료로 변경
      const { error } = await window.supabaseClient
        .from('accident_records')
        .update({ status: '정산완료' })
        .in('id', pendingSettleAction.ids);
      
      checkError(error);
      
      alert(`${pendingSettleAction.ids.length}개 건이 정산 완료 처리되었습니다.`);
      
    } else if (pendingSettleAction.type === 'workshop') {
      // 해당 시공점의 해당 월 모든 건을 정산완료로 변경
      // 먼저 해당 시공점의 모든 건을 조회한 후 클라이언트 사이드에서 월 필터링
      let query = window.supabaseClient
        .from('accident_records')
        .select('*')
        .in('assigned_workshop_name', pendingSettleAction.workshops)
        .in('status', ['시공완료', '정산대기']);
      
      const { data: allRecords, error: fetchError } = await query;
      
      if (fetchError) {
        checkError(fetchError);
        return;
      }
      
      // 월 필터링
      const monthFiltered = filterByMonth(allRecords || [], pendingSettleAction.month);
      const idsToUpdate = monthFiltered.map(r => r.id);
      
      if (idsToUpdate.length === 0) {
        alert('해당 월에 정산할 건이 없습니다.');
        return;
      }
      
      const { error } = await window.supabaseClient
        .from('accident_records')
        .update({ status: '정산완료' })
        .in('id', idsToUpdate);
      
      checkError(error);
      
      alert(`${pendingSettleAction.workshops.length}개 시공점의 ${pendingSettleAction.month}월 정산이 완료 처리되었습니다.`);
    }
    
    closeSettleModal();
    selectedRecords.clear();
    selectedWorkshops.clear();
    loadData();
    
  } catch (e) {
    console.error('Failed to settle:', e);
    alert('정산 완료 처리 중 오류가 발생했습니다.');
  }
}

// 모달 닫기
function closeSettleModal() {
  document.getElementById('settleModal').classList.remove('active');
  pendingSettleAction = null;
}

// 엑셀 다운로드
async function downloadExcel() {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    alert('데이터베이스 연결에 실패했습니다.');
    return;
  }
  
  try {
    let excelData = [];
    let filename = '';
    
    if (currentTab === 1) {
      // 탭 1: 수리 건별 상세
      excelData = detailRecords.map(record => ({
        '접수번호': record.receipt_number || record.case_no || '',
        '고객명': record.customer_name || '',
        '차량번호': record.car_number || record.car_no || '',
        '차명': record.car_model || '',
        '차급': record.vehicle_grade || '',
        '파손유형': record.damage_type || '',
        '면책금': record.deductible || '',
        '면책금 납부방식': record.deductible_type || record.deductible_pay_type || '',
        '공임': record.labor_cost || 0,
        '시공점': record.assigned_workshop_name || '',
        '사고일': formatAccidentDate(getAccidentDateColumn(record)),
        '정산상태': record.status === '정산완료' ? '정산완료' : '미정산'
      }));
      
      const month = document.getElementById('filterMonth').value || '전체';
      filename = `정산_수리건별상세_${month}.xlsx`;
      
    } else if (currentTab === 2) {
      // 탭 2: 시공점별 월 집계
      excelData = workshopAggregates.map(agg => ({
        '시공점명': agg.workshop_name,
        '소형(건)': agg.small_count,
        '중형(건)': agg.medium_count,
        '대형(건)': agg.large_count,
        '총 작업건': agg.total_count,
        '총 공임': agg.total_amount,
        '정산상태': agg.status
      }));
      
      const month = document.getElementById('filterMonth').value || '전체';
      filename = `정산_시공점별집계_${month}.xlsx`;
      
    } else if (currentTab === 3) {
      // 탭 3: 전체 월 집계
      excelData = monthlyAggregates.map(agg => ({
        '정산월': agg.month,
        '소형(건)': agg.small_count,
        '중형(건)': agg.medium_count,
        '대형(건)': agg.large_count,
        '총 건수': agg.total_count,
        '총 정산금액': agg.total_amount
      }));
      
      filename = `정산_전체월집계.xlsx`;
    }
    
    if (excelData.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // 컬럼 너비 설정
    const colWidths = excelData.length > 0 
      ? Object.keys(excelData[0]).map(() => ({ wch: 15 }))
      : [];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, '정산데이터');
    XLSX.writeFile(wb, filename);
    
    console.log(`[엑셀 다운로드] 완료: ${excelData.length}개 행, 파일명: ${filename}`);
    
  } catch (e) {
    console.error('Failed to download Excel:', e);
    alert('엑셀 다운로드 중 오류가 발생했습니다: ' + (e.message || '알 수 없는 오류'));
  }
}

