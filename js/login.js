import { supabase } from "./supabase.js";

// 기본 로그인 로직
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  
  if (!loginForm) {
    console.warn("Login form not found");
    return;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("errorMessage");

    if (!emailInput || !passwordInput) {
      console.error("Email or password input not found");
      return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      if (errorMessage) {
        errorMessage.textContent = "이메일과 비밀번호를 입력해주세요.";
        errorMessage.style.display = "block";
      }
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (errorMessage) {
          errorMessage.textContent = "로그인 실패: " + error.message;
          errorMessage.style.display = "block";
        } else {
          alert("로그인 실패: " + error.message);
        }
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
          if (errorMessage) {
            errorMessage.textContent = "비활성화된 계정입니다. 관리자에게 문의하세요.";
            errorMessage.style.display = "block";
          } else {
            alert("비활성화된 계정입니다. 관리자에게 문의하세요.");
          }
          return;
        }
      }

      window.location.href = "/dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      if (errorMessage) {
        errorMessage.textContent = "로그인 중 오류가 발생했습니다.";
        errorMessage.style.display = "block";
      } else {
        alert("로그인 중 오류가 발생했습니다.");
      }
    }
  });
});
