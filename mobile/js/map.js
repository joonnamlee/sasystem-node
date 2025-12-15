// 시공점 지도 페이지 로직

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

let map = null;
let markers = [];

// 지도 초기화
async function initMap() {
  try {
    await waitForSupabase();
    
    // 카카오맵 로드
    kakao.maps.load(() => {
      const container = document.getElementById('map');
      const options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울시청
        level: 5
      };
      
      map = new kakao.maps.Map(container, options);
      
      // 시공점 로드 및 마커 표시
      loadWorkshops();
    });
    
  } catch (error) {
    console.error('지도 초기화 오류:', error);
    showToast('지도를 불러오는 중 오류가 발생했습니다.', 'error');
  }
}

// 시공점 로드
async function loadWorkshops() {
  try {
    const supabase = window.supabaseClient;
    
    const { data, error } = await supabase
      .from('installer_locations')
      .select('*')
      .eq('is_active', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      showToast('표시할 시공점이 없습니다.', 'info');
      return;
    }
    
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // 마커 생성
    data.forEach(workshop => {
      const position = new kakao.maps.LatLng(workshop.lat, workshop.lng);
      const marker = new kakao.maps.Marker({ position });
      marker.setMap(map);
      
      // 인포윈도우
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:8px;font-size:12px;"><strong>${workshop.name || '-'}</strong><br>${workshop.address || '-'}</div>`
      });
      
      kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
      });
      
      markers.push(marker);
    });
    
    // 지도 범위 조정
    if (markers.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      map.setBounds(bounds);
    }
    
  } catch (error) {
    console.error('시공점 로드 오류:', error);
    showToast('시공점을 불러오는 중 오류가 발생했습니다.', 'error');
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateBottomNavActive === 'function') {
    updateBottomNavActive('map');
  }
  initMap();
});

