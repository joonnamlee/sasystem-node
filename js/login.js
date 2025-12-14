import { supabase } from "./supabase.js";

// 페이지 로드 시 체크박스 상태 확인
document.addEventListener("DOMContentLoaded", () => {
  const rememberMe = document.getElementById("rememberMe");
  const passwordInput = document.getElementById("password");
  
  if (rememberMe && passwordInput) {
    // 체크박스가 체크되지 않았으면 비밀번호 필드 비우기
    const clearPassword = () => {
      if (!rememberMe.checked) {
        passwordInput.value = "";
      }
    };
    
    // 즉시 실행
    clearPassword();
    
    // 브라우저 자동완성 대응: 약간의 지연 후 다시 확인
    setTimeout(clearPassword, 100);
    setTimeout(clearPassword, 500);
    
    // 체크박스 상태 변경 시 처리
    rememberMe.addEventListener("change", () => {
      if (!rememberMe.checked) {
        passwordInput.value = "";
      }
    });
    
    // 비밀번호 필드에 포커스가 갈 때도 확인
    passwordInput.addEventListener("focus", () => {
      if (!rememberMe.checked) {
        passwordInput.value = "";
      }
    });
  }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("로그인 실패: " + error.message);
    return;
  }

  // 로그인 후 상태 체크
  if (data.user) {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("active")
      .eq("id", data.user.id)
      .single();

    if (!userError && userData && userData.active === false) {
      await supabase.auth.signOut();
      alert("비활성화된 계정입니다. 관리자에게 문의하세요.");
      return;
    }
  }

  window.location.href = "/dashboard.html";
});
