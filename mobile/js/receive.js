// 사고 접수 페이지 로직

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

// 하단 탭 활성화
function updateBottomNavActive(page) {
  const navItems = document.querySelectorAll('.m-bottom-nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });
}

let currentStep = 1;
let formData = {};

// 카카오 메시지 파싱
async function parseKakaoMessage() {
  const message = document.getElementById('kakaoMessage').value.trim();
  
  if (!message) {
    showToast('메시지를 입력해주세요.', 'error');
    return;
  }
  
  try {
    // 간단한 파싱 로직 (실제로는 더 정교한 파싱 필요)
    const lines = message.split('\n');
    
    formData = {
      carNumber: extractCarNumber(message),
      carModel: extractCarModel(message),
      damageType: extractDamageType(message),
      deductible: extractDeductible(message),
      address: extractAddress(message),
      customerName: extractCustomerName(message),
      phone: extractPhone(message)
    };
    
    // Step 2로 이동
    updateStep(2);
    updateStep2Data();
    
  } catch (error) {
    console.error('파싱 오류:', error);
    showToast('메시지 파싱 중 오류가 발생했습니다.', 'error');
  }
}

// 간단한 추출 함수들 (실제로는 더 정교한 로직 필요)
function extractCarNumber(text) {
  const match = text.match(/([가-힣]{2}\d{2,4}[가-힣]{1}\d{4})|(\d{2,3}[가-힣]{1}\d{4})/);
  return match ? match[0] : '';
}

function extractCarModel(text) {
  const brands = ['현대', '기아', '쌍용', '르노', '제네시스', '벤츠', 'BMW', '아우디'];
  for (const brand of brands) {
    if (text.includes(brand)) {
      const match = text.match(new RegExp(`${brand}[\\s\\S]{0,20}`));
      return match ? match[0].trim() : brand;
    }
  }
  return '';
}

function extractDamageType(text) {
  if (text.includes('앞유리') || text.includes('윈드실드')) return '앞유리';
  if (text.includes('뒤유리')) return '뒤유리';
  if (text.includes('사이드')) return '사이드';
  return '앞유리';
}

function extractDeductible(text) {
  const match = text.match(/(\d{1,3}[,\d]*)\s*만?\s*원/);
  return match ? match[1].replace(/,/g, '') : '0';
}

function extractAddress(text) {
  const match = text.match(/([가-힣]{2,}(시|도|구|군|동|읍|면|리)[\s\S]{0,50})/);
  return match ? match[0].trim() : '';
}

function extractCustomerName(text) {
  const match = text.match(/([가-힣]{2,4})\s*(님|고객|선생님)/);
  return match ? match[1] : '';
}

function extractPhone(text) {
  const match = text.match(/(\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})/);
  return match ? match[0] : '';
}

// Step 2 데이터 업데이트
function updateStep2Data() {
  document.getElementById('carNumberValue').textContent = formData.carNumber || '-';
  document.getElementById('carModelValue').textContent = formData.carModel || '-';
  document.getElementById('damageTypeValue').textContent = formData.damageType || '-';
  document.getElementById('deductibleValue').textContent = formData.deductible ? formData.deductible + '원' : '-';
}

// Step 3로 이동
async function goToStep3() {
  updateStep(3);
  await loadWorkshops();
}

// Step 업데이트
function updateStep(step) {
  currentStep = step;
  
  // 모든 step 비활성화
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`step${i}`).classList.remove('active');
    document.getElementById(`stepContent${i}`).classList.add('m-hidden');
  }
  
  // 현재 step 활성화
  document.getElementById(`step${step}`).classList.add('active');
  document.getElementById(`stepContent${step}`).classList.remove('m-hidden');
}

// 시공점 로드
async function loadWorkshops() {
  try {
    await waitForSupabase();
    const supabase = window.supabaseClient;
    
    const { data, error } = await supabase
      .from('installer_locations')
      .select('*')
      .eq('is_active', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(5);
    
    if (error) throw error;
    
    const container = document.getElementById('workshopList');
    
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="m-empty-state-text">시공점이 없습니다.</div>';
      return;
    }
    
    const html = data.map((workshop, index) => `
      <div class="m-card-row" style="padding: 12px 0; border-bottom: 1px solid var(--border);">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">${workshop.name || '-'}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">${workshop.address || '-'}</div>
        </div>
        <input type="radio" name="workshop" value="${workshop.id}" ${index === 0 ? 'checked' : ''}>
      </div>
    `).join('');
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('시공점 로드 오류:', error);
    document.getElementById('workshopList').innerHTML = '<div class="m-empty-state-text">시공점을 불러오는 중 오류가 발생했습니다.</div>';
  }
}

// 지도 열기
function openMap() {
  window.location.href = '/mobile/map.html';
}

// 접수 제출
async function submitReceipt() {
  const selectedWorkshop = document.querySelector('input[name="workshop"]:checked');
  
  if (!selectedWorkshop) {
    showToast('시공점을 선택해주세요.', 'error');
    return;
  }
  
  try {
    await waitForSupabase();
    
    // API 함수 사용 (accidentapi.js에서 로드됨)
    if (!window.saveAccidentRecord) {
      showToast('API 함수를 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }
    
    const recordData = {
      ...formData,
      assigned_workshop_id: selectedWorkshop.value,
      status: '접수완료'
    };
    
    const result = await window.saveAccidentRecord(recordData);
    
    if (result && result.receipt_number) {
      document.getElementById('receiptNumberResult').textContent = result.receipt_number;
      updateStep(4);
    } else {
      showToast('접수 저장 중 오류가 발생했습니다.', 'error');
    }
    
  } catch (error) {
    console.error('접수 제출 오류:', error);
    showToast('접수 저장 중 오류가 발생했습니다.', 'error');
  }
}

// 접수 현황으로 이동
function goToStatus() {
  window.location.href = '/mobile/index.html';
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  updateBottomNavActive('receive');
});

