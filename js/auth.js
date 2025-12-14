import { supabase } from "./supabase.js";

export async function logout() {
  await supabase.auth.signOut();
  window.location.replace("/login.html");
}

// 로그인 필수 페이지용
export async function requireAuth() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.replace("/login.html");
    return null;
  }

  // inactive 유저 체크 (public.users 테이블에서 확인)
  const user = data.session.user;
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("active")
    .eq("id", user.id)
    .single();

  if (!userError && userData && userData.active === false) {
    await supabase.auth.signOut();
    alert("비활성화된 계정입니다. 관리자에게 문의하세요.");
    window.location.replace("/login.html");
    return null;
  }

  return user;
}

// 관리자 전용 페이지용
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  const role = session?.user?.app_metadata?.role;
  console.log("USER ROLE:", role);

  if (role !== "admin") {
    alert("관리자만 접근 가능합니다.");
    window.location.href = "/login.html";
  }
}
