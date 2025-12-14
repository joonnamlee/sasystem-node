// Supabase client 초기화
const SUPABASE_URL = "https://orbcrktuzhvjqjdtvfgi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZTMRfjMxgUuT2Dz-zZmqYQ_qrHb2U6z";

// 즉시 실행 (DOMContentLoaded 대기하지 않음)
(function() {
  // CDN에서 로드된 window.supabase 객체 확인
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase CDN not loaded');
    return;
  }

  // createClient 메서드 참조 저장
  const { createClient } = window.supabase;

  // window.supabase에 직접 client 인스턴스 할당 (단일화)
  window.supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // 하위 호환성을 위해 window.supabaseClient도 할당
  window.supabaseClient = window.supabase;

  window.__supabaseReady = true;
  window.supabaseReady = true;
  console.log('Supabase client initialized', window.supabase);
  
  // 준비 완료 이벤트 발생
  window.dispatchEvent(new CustomEvent('supabaseReady'));
})();

