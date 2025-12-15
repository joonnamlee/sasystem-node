// 모바일 전용 JavaScript

// 전역 변수
let currentUser = null;
let currentSession = null;

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

// 모바일 Drawer 메뉴 열기
function openMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('mobileBackdrop');
  
  if (drawer && backdrop) {
    drawer.classList.add('open');
    backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

// 모바일 Drawer 메뉴 닫기
function closeMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('mobileBackdrop');
  
  if (drawer && backdrop) {
    drawer.classList.remove('open');
    backdrop.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// 햄버거 메뉴 토글 (하위 호환)
function toggleMobileMenu() {
  const drawer = document.getElementById('mobileDrawer');
  if (drawer && drawer.classList.contains('open')) {
    closeMobileDrawer();
  } else {
    openMobileDrawer();
  }
}

// 햄버거 메뉴 닫기 (하위 호환)
function closeMobileMenu() {
  closeMobileDrawer();
}

// 하단 탭 네비게이션
function navigateToPage(page) {
  if (page === 'more') {
    toggleMobileMenu();
    return;
  }
  
  const pages = {
    'status': '/mobile/index.html',
    'receive': '/mobile/receive.html',
    'map': '/mobile/map.html',
    'message': '/mobile/message.html',
    'more': '#'
  };
  
  if (pages[page]) {
    window.location.href = pages[page];
  }
}

// 하단 탭 활성화 업데이트
function updateBottomNavActive(page) {
  const navItems = document.querySelectorAll('.m-bottom-nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });
}

// 햄버거 메뉴 항목 클릭
function navigateFromMenu(page) {
  const pages = {
    'workshop': '/pages/installer/management.html',
    'vehicle': '/vehicle-management.html',
    'settlement': '/settlement-management.html',
    'stats': '/pages/stats/index.html',
    'users': '/users.html'
  };
  
  if (pages[page]) {
    window.location.href = pages[page];
  }
  closeMobileMenu();
}

// 프로필 클릭 (로그아웃)
async function handleProfileClick() {
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
      const { logout } = await import('/js/auth.js');
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login.html';
    }
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

// 이벤트 리스너 초기화
function initMobileEvents() {
  // 햄버거 버튼
  const hamburgerBtn = document.querySelector('.m-hamburger-btn');
  if (hamburgerBtn) {
    ['click', 'touchend'].forEach(eventType => {
      hamburgerBtn.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        openMobileDrawer();
        return false;
      }, { passive: false });
    });
  }
  
  // Backdrop 클릭
  const backdrop = document.getElementById('mobileBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeMobileDrawer();
      }
    });
  }
  
  // Drawer 메뉴 항목 클릭
  const menuItems = document.querySelectorAll('.drawer-menu li');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const link = item.dataset.link;
      if (link) {
        closeMobileDrawer();
        setTimeout(() => {
          window.location.href = link;
        }, 250); // Drawer 닫힌 후 이동
      }
    });
  });
  
  // 하단 탭 네비게이션
  const bottomNavItems = document.querySelectorAll('.m-bottom-nav-item');
  bottomNavItems.forEach(item => {
    ['click', 'touchend'].forEach(eventType => {
      item.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        const page = item.dataset.page;
        if (page) {
          navigateToPage(page);
        }
        return false;
      }, { passive: false });
    });
  });
  
  // 프로필 버튼
  const profileBtn = document.querySelector('.m-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', handleProfileClick);
  }
  
  // 로그아웃 버튼
  const logoutBtn = document.getElementById('mLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleProfileClick);
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Supabase 세션 확인
    await waitForSupabase();
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (!session) {
      window.location.href = '/login.html';
      return;
    }
    
    currentSession = session;
    currentUser = session.user;
    
    // 프로필 아이콘 업데이트
    const profileBtn = document.querySelector('.m-profile-btn');
    if (profileBtn && currentUser) {
      const name = currentUser.email || currentUser.user_metadata?.name || 'U';
      profileBtn.textContent = name.charAt(0).toUpperCase();
    }
    
    // 관리자 메뉴 표시/숨김
    const role = currentUser?.app_metadata?.role;
    if (role === 'admin') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.add('show');
      });
    } else {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.remove('show');
      });
    }
    
    // 이벤트 리스너 초기화
    initMobileEvents();
    
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('초기화 중 오류가 발생했습니다.', 'error');
  }
});

// 전역 함수 노출
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;
window.navigateToPage = navigateToPage;
window.navigateFromMenu = navigateFromMenu;
window.showToast = showToast;

