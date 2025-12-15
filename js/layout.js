// 공통 레이아웃 JavaScript

console.log("layout.js loaded");

// Drawer 열기
function openDrawer() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  
  if (drawer && overlay) {
    drawer.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

// Drawer 닫기
function closeDrawer() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  
  if (drawer && overlay) {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
    overlay.style.pointerEvents = 'none';
    document.body.style.overflow = '';
  }
}

// 페이지 타이틀 업데이트
function updatePageTitle(title) {
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) {
    titleEl.textContent = title;
  }
}

// 프로필 아이콘 업데이트
function updateProfileIcon(initial) {
  const profileEl = document.getElementById('profileCircle');
  if (profileEl) {
    profileEl.textContent = initial || 'J';
  }
}

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

// PC 화면인지 확인
function isDesktop() {
  return window.innerWidth >= 1024;
}

// 레이아웃 초기화 함수
function initLayout() {
  console.log("initLayout called");
  
  // PC 화면에서는 모바일 메뉴 초기화하지 않음
  if (isDesktop()) {
    console.log("Desktop detected, skipping mobile menu initialization");
    return;
  }
  
  // 필수 요소 존재 확인
  const hamburger = document.getElementById('hamburgerBtn');
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  
  if (!hamburger || !drawer || !overlay) {
    console.warn("Layout elements not found, retrying...");
    setTimeout(initLayout, 100);
    return;
  }
  
  console.log("All layout elements found, binding events");
  
  // 햄버거 버튼 이벤트
  ['click', 'touchend'].forEach(eventType => {
    hamburger.addEventListener(eventType, (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("hamburger clicked");
      openDrawer();
      return false;
    }, { passive: false });
  });
  
  // Overlay 클릭 시 닫기
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      console.log("overlay clicked, closing drawer");
      closeDrawer();
    }
  });
  
  // 하단 네비게이션 클릭 이벤트 바인딩
  const bottomNavItems = document.querySelectorAll('.m-bottom-nav-item');
  bottomNavItems.forEach(item => {
    ['click', 'touchend'].forEach(eventType => {
      item.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("bottom nav clicked:", item.dataset.page);
        
        const page = item.dataset.page;
        if (page) {
          // 하단 네비게이션 페이지 이동
          const pageMap = {
            'status': '/mobile/index.html',
            'receive': '/mobile/receive.html',
            'map': '/mobile/map.html',
            'message': '/mobile/message.html',
            'more': () => {
              // 더보기 클릭 시 햄버거 메뉴 열기
              openDrawer();
            }
          };
          
          if (typeof pageMap[page] === 'function') {
            pageMap[page]();
          } else if (pageMap[page]) {
            window.location.href = pageMap[page];
          }
        }
        return false;
      }, { passive: false });
    });
  });
  
  // Drawer 메뉴 항목 클릭
  const menuItems = document.querySelectorAll('.drawer-menu li');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const link = item.dataset.link;
      if (link) {
        closeDrawer();
        setTimeout(() => {
          window.location.href = link;
        }, 250);
      }
    });
  });
  
  // 로그아웃 버튼
  const logoutBtn = document.getElementById('drawerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        try {
          const { logout } = await import('/js/auth.js');
          await logout();
        } catch (error) {
          console.error('Logout error:', error);
          window.location.href = '/login.html';
        }
      }
    });
  }
  
  // 프로필 클릭 (로그아웃)
  const profileCircle = document.getElementById('profileCircle');
  if (profileCircle) {
    profileCircle.addEventListener('click', async () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        try {
          const { logout } = await import('/js/auth.js');
          await logout();
        } catch (error) {
          console.error('Logout error:', error);
          window.location.href = '/login.html';
        }
      }
    });
  }
  
  // 관리자 메뉴 표시/숨김
  (async () => {
    try {
      await waitForSupabase();
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      
      if (session?.user) {
        const role = session.user.app_metadata?.role;
        
        // 프로필 아이콘 업데이트
        const name = session.user.email || session.user.user_metadata?.name || 'U';
        updateProfileIcon(name.charAt(0).toUpperCase());
        
        // 관리자 메뉴 표시
        if (role === 'admin') {
          document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.add('show');
          });
        } else {
          document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('show');
          });
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  })();
}

// DOMContentLoaded 또는 즉시 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // PC 화면에서는 모바일 메뉴 초기화하지 않음
    if (!isDesktop()) {
      setTimeout(initLayout, 100);
    }
  });
} else {
  // PC 화면에서는 모바일 메뉴 초기화하지 않음
  if (!isDesktop()) {
    setTimeout(initLayout, 100);
  }
}

// 전역 함수 노출
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.updatePageTitle = updatePageTitle;
window.updateProfileIcon = updateProfileIcon;
window.initLayout = initLayout;

