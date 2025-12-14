// Accident Bootstrap - Initialize Supabase and API functions globally
// 전역 객체 사용 (ESM import 제거)
(function() {
  'use strict';
  
  try {
    // 전역 객체에서 supabase 가져오기
    if (!window.supabaseClient) {
      console.error("Supabase client가 초기화되지 않았습니다.");
      return;
    }
    
    // Make supabase available globally for backward compatibility
    window.supabase = window.supabaseClient;
    
    // API functions는 이미 accidentApi.js에서 전역으로 설정됨
    
    // Signal that Supabase is ready
    window.supabaseReady = true;
    window.dispatchEvent(new CustomEvent('supabaseReady'));
    
    console.log("✅ Accident Bootstrap 초기화 완료");
  } catch (error) {
    console.error("Failed to initialize Supabase:", error);
    alert("Supabase 초기화 실패: " + error.message + "\n페이지를 새로고침해주세요.");
  }
})();

