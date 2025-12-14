import { requireAdmin } from "/js/auth.js";
import { supabase, SUPABASE_URL } from "/js/supabase.js";

let currentUserId = null;
let allUsers = [];

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function getErrorMessage(error) {
  const errorMessages = {
    "permission denied": "권한이 없습니다.",
    "not found": "유저를 찾을 수 없습니다.",
    "invalid input": "잘못된 입력입니다.",
    "unauthorized": "인증이 필요합니다."
  };

  const errorMsg = error?.message?.toLowerCase() || "";
  for (const [key, message] of Object.entries(errorMessages)) {
    if (errorMsg.includes(key)) {
      return message;
    }
  }
  return error?.message || "오류가 발생했습니다.";
}

async function toggleUserStatus(userId, currentStatus) {
  const newStatus = !currentStatus;
  
  const { error } = await supabase.rpc("admin_update_user_status", {
    target_user_id: userId,
    new_status: newStatus
  });

  if (error) {
    alert(getErrorMessage(error));
    return;
  }

  await loadUsers();
  showToast(newStatus ? "유저가 활성화되었습니다." : "유저가 비활성화되었습니다.");
}

async function changeUserRole(userId, newRole) {
  if (!confirm("권한을 변경하시겠습니까?")) {
    return;
  }

  const { error } = await supabase.rpc("admin_update_user_role", {
    target_user_id: userId,
    new_role: newRole
  });

  if (error) {
    alert(getErrorMessage(error));
    return;
  }

  await loadUsers();
}

async function deleteUser(userId, userRole) {
  // admin 계정 개수 확인
  const adminCount = allUsers.filter(u => u.role === "admin" && u.active).length;
  
  if (userRole === "admin" && adminCount <= 1) {
    alert("최소 1명의 관리자 계정이 필요합니다.");
    return;
  }

  if (!confirm("정말 이 유저를 삭제하시겠습니까? (비활성화 처리)")) {
    return;
  }

  const { error } = await supabase.rpc("admin_update_user_status", {
    target_user_id: userId,
    new_status: false
  });

  if (error) {
    alert(getErrorMessage(error));
    return;
  }

  await loadUsers();
  showToast("유저가 삭제되었습니다.");
}

function renderUsers(data) {
  if (!data || !Array.isArray(data)) {
    console.warn("No users returned or data is not an array");
    const tbody = document.querySelector("#usersTable tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">유저 데이터가 없습니다.</td></tr>`;
    }
    return;
  }

  allUsers = data;

  const tbody = document.querySelector("#usersTable tbody");
  if (!tbody) {
    console.error("Table tbody not found");
    return;
  }
  
  tbody.innerHTML = "";

  data.forEach(user => {
    const isCurrentUser = user.id === currentUserId;
    const tr = document.createElement("tr");
    if (!user.active) {
      tr.classList.add("inactive");
    }

    // 상태 토글 스위치
    const toggleSwitch = document.createElement("label");
    toggleSwitch.className = "toggle-switch";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = user.active;
    toggleInput.disabled = isCurrentUser;
    toggleInput.addEventListener("change", () => {
      if (toggleInput.checked !== user.active) {
        toggleUserStatus(user.id, user.active);
      }
    });
    const toggleSlider = document.createElement("span");
    toggleSlider.className = "toggle-slider";
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);

    // 역할 변경 셀렉트
    const roleSelect = document.createElement("select");
    roleSelect.className = "role-select";
    roleSelect.disabled = isCurrentUser;
    roleSelect.innerHTML = `
      <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
      <option value="user" ${user.role === "user" ? "selected" : ""}>user</option>
    `;
    roleSelect.addEventListener("change", (e) => {
      if (e.target.value !== user.role) {
        changeUserRole(user.id, e.target.value);
      }
    });

    // 삭제 버튼
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "삭제";
    deleteBtn.disabled = isCurrentUser;
    deleteBtn.addEventListener("click", () => deleteUser(user.id, user.role));

    const actionCell = document.createElement("td");
    actionCell.className = "action-buttons";
    actionCell.appendChild(toggleSwitch);
    actionCell.appendChild(roleSelect);
    actionCell.appendChild(deleteBtn);

    tr.innerHTML = `
      <td>${user.email || "-"}</td>
      <td>${user.role || "-"}</td>
      <td>${user.active ? "활성" : "비활성"}</td>
      <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</td>
    `;
    tr.appendChild(actionCell);
    tbody.appendChild(tr);
  });
}

async function loadUsers() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUserId = session.user.id;
  }

  const { data, error } = await supabase.rpc("get_all_users_for_admin");

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  renderUsers(data);
}

async function inviteUser() {
  const email = document.getElementById("inviteEmail").value.trim();
  const role = document.getElementById("inviteRole").value;

  if (!email) {
    alert("이메일을 입력해주세요.");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": "sb_publishable_ZTMRfjMxgUuT2Dz-zZmqYQ_qrHb2U6z"
      },
      body: JSON.stringify({ email, role })
    });

    const result = await response.json();

    if (!response.ok) {
      alert(getErrorMessage({ message: result.error }));
      return;
    }

    document.getElementById("inviteModal").classList.remove("active");
    document.getElementById("inviteForm").reset();
    await loadUsers();
    showToast("유저 초대가 완료되었습니다.");
  } catch (error) {
    console.error("Invite error:", error);
    alert("유저 초대 중 오류가 발생했습니다.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireAdmin();
  await loadUsers();

  // 유저 초대 모달
  const inviteBtn = document.getElementById("inviteUserBtn");
  const inviteModal = document.getElementById("inviteModal");
  const cancelBtn = document.getElementById("cancelInviteBtn");
  const inviteForm = document.getElementById("inviteForm");

  inviteBtn.addEventListener("click", () => {
    inviteModal.classList.add("active");
  });

  cancelBtn.addEventListener("click", () => {
    inviteModal.classList.remove("active");
    inviteForm.reset();
  });

  inviteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await inviteUser();
  });

  // 모달 외부 클릭 시 닫기
  inviteModal.addEventListener("click", (e) => {
    if (e.target === inviteModal) {
      inviteModal.classList.remove("active");
      inviteForm.reset();
    }
  });
});

