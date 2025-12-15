let vehicles = [];

// 차급 허용 값
const ALLOWED_GRADES = ['소형', '중형', '대형'];

// Supabase 클라이언트 대기
function waitForSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient && window.supabaseReady) {
      resolve();
      return;
    }
    
    window.addEventListener('supabaseReady', () => {
      resolve();
    }, { once: true });
    
    setTimeout(() => {
      if (window.supabaseClient) {
        resolve();
      } else {
        console.warn('Supabase client not ready after timeout');
        resolve();
      }
    }, 2000);
  });
}

// 에러 처리
function checkError(error) {
  if (error) {
    console.error("Supabase error:", error);
    alert("오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
    throw error;
  }
}

// 차급 검증
function validateGrade(grade) {
  return ALLOWED_GRADES.includes(grade);
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();
  loadVehicles();
});

// 차량 목록 로드
async function loadVehicles() {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    document.getElementById("vehicleList").innerHTML = 
      '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #dc2626;">데이터베이스 연결 실패</td></tr>';
    return;
  }

  try {
    const gradeFilter = document.getElementById("filterClass").value;
    const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();

    let query = window.supabaseClient
      .from("vehicles")
      .select("*");

    if (gradeFilter) {
      query = query.eq("grade", gradeFilter);
    }

    const { data, error } = await query
      .order("manufacturer", { ascending: true })
      .order("model", { ascending: true });

    checkError(error);

    vehicles = data || [];

    // 검색 필터링
    if (searchTerm) {
      vehicles = vehicles.filter(v => 
        (v.manufacturer || "").toLowerCase().includes(searchTerm) ||
        (v.model || "").toLowerCase().includes(searchTerm)
      );
    }

    renderVehicles();
  } catch (e) {
    console.error("Failed to load vehicles:", e);
    document.getElementById("vehicleList").innerHTML = 
      '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #dc2626;">데이터 로드 실패</td></tr>';
  }
}

// 차량 목록 렌더링
function renderVehicles() {
  const tbody = document.getElementById("vehicleList");
  const cardList = document.getElementById("mVehicleCardList");
  
  if (vehicles.length === 0) {
    tbody.innerHTML = 
      '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #9ca3af;">차량이 없습니다.</td></tr>';
    if (cardList) {
      cardList.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">차량이 없습니다.</div>';
    }
    updateMobileFixedActions();
    return;
  }

  // 차급 배지 스타일 함수
  function getGradeBadge(grade) {
    let gradeBadgeClass = 'badge-class-medium';
    if (grade === '소형') {
      gradeBadgeClass = 'badge-class-small';
    } else if (grade === '대형') {
      gradeBadgeClass = 'badge-class-large';
    }
    return `<span class="badge ${gradeBadgeClass}">${escapeHtml(grade || "")}</span>`;
  }

  // 데스크톱 테이블 렌더링
  tbody.innerHTML = vehicles.map(v => {
    const gradeBadge = getGradeBadge(v.grade);
    
    return `
      <tr data-vehicle-id="${v.id}">
        <td>${escapeHtml(v.manufacturer || "")}</td>
        <td>${escapeHtml(v.model || "")}</td>
        <td>${gradeBadge}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(v.notes || "")}
        </td>
        <td>
          <button class="btn btn-sm btn-edit" onclick="openEditModal('${v.id}')">수정</button>
        </td>
      </tr>
    `;
  }).join('');

  // 모바일 카드 리스트 렌더링
  if (cardList) {
    cardList.innerHTML = vehicles.map(v => {
      const gradeBadge = getGradeBadge(v.grade);
      
      return `
        <div class="m-card-item" data-vehicle-id="${v.id}">
          <div class="m-card-header">${escapeHtml(v.manufacturer || "")} ${escapeHtml(v.model || "")}</div>
          <div class="m-card-row">
            <span class="m-card-label">제조사</span>
            <span class="m-card-value">${escapeHtml(v.manufacturer || "")}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">차량명</span>
            <span class="m-card-value">${escapeHtml(v.model || "")}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">차급</span>
            <span class="m-card-value">${gradeBadge}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">메모</span>
            <span class="m-card-value">${escapeHtml(v.notes || "")}</span>
          </div>
          <div style="margin-top: 12px;">
            <button class="btn btn-sm btn-edit" onclick="openEditModal('${v.id}')" style="width: 100%;">수정</button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateMobileFixedActions();
}

// 모바일 고정 버튼 업데이트
function updateMobileFixedActions() {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;
  
  const fixedActions = document.getElementById('mFixedActions');
  if (fixedActions) {
    fixedActions.style.display = 'flex';
  }
}

// 윈도우 리사이즈 시 모바일 버튼 업데이트
window.addEventListener('resize', () => {
  updateMobileFixedActions();
});

// 페이지 로드 시 모바일 버튼 초기화
window.addEventListener('DOMContentLoaded', () => {
  updateMobileFixedActions();
});

// HTML 이스케이프
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 엑셀 다운로드
async function downloadExcel() {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    alert("데이터베이스 연결에 실패했습니다.");
    return;
  }

  try {
    // 전체 차량 데이터 조회
    const { data, error } = await window.supabaseClient
      .from("vehicles")
      .select("*")
      .order("manufacturer", { ascending: true })
      .order("model", { ascending: true });

    checkError(error);

    if (!data || data.length === 0) {
      alert("다운로드할 차량 데이터가 없습니다.");
      return;
    }

    // 엑셀 데이터 생성 (순번은 1부터 재생성)
    const excelData = data.map((v, index) => ({
      순번: index + 1,
      제조사: v.manufacturer || "",
      차량명: v.model || "",
      차급: v.grade || ""
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 8 },   // 순번
      { wch: 15 },  // 제조사
      { wch: 25 },  // 차량명
      { wch: 10 }   // 차급
    ];

    XLSX.utils.book_append_sheet(wb, ws, "차량");

    // 파일명 생성 (YYYYMMDD 형식)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const filename = `vehicles_${year}${month}${day}.xlsx`;

    // 다운로드
    XLSX.writeFile(wb, filename);
    
    console.log(`[엑셀 다운로드] 완료: ${data.length}개 차량, 파일명: ${filename}`);
  } catch (e) {
    console.error("Failed to download Excel:", e);
    alert("엑셀 다운로드 중 오류가 발생했습니다: " + (e.message || "알 수 없는 오류"));
  }
}

// 엑셀 업로드
async function uploadExcel() {
  const fileInput = document.getElementById("excelFile");
  const statusEl = document.getElementById("uploadStatus");
  
  if (!fileInput.files[0]) {
    alert("엑셀 파일을 선택해주세요.");
    return;
  }

  statusEl.className = "status-message info";
  statusEl.style.display = "block";
  statusEl.textContent = "엑셀 처리 중...";

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      await waitForSupabase();
      
      if (!window.supabaseClient) {
        statusEl.className = "status-message error";
        statusEl.textContent = "❌ 데이터베이스 연결 실패";
        return;
      }

      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const rows = json.filter(r => (r.제조사 || r["제조사"]) && (r.차량명 || r["차량명"]));
      if (!rows.length) {
        statusEl.className = "status-message error";
        statusEl.textContent = "❌ '제조사' 또는 '차량명' 컬럼이 포함된 행이 없습니다.";
        return;
      }

      let validCount = 0;
      let invalidCount = 0;
      const validRecords = [];

      for (const r of rows) {
        const manufacturer = (r.제조사 || r["제조사"] || "").trim();
        const model = (r.차량명 || r["차량명"] || "").trim();
        const grade = (r.차급 || r["차급"] || "").trim();

        if (!manufacturer || !model) {
          invalidCount++;
          continue;
        }

        // 차급 검증
        if (!validateGrade(grade)) {
          console.warn(`[엑셀 업로드] 차급 검증 실패: ${grade} (제조사: ${manufacturer}, 차량명: ${model})`);
          invalidCount++;
          continue;
        }

        validRecords.push({
          manufacturer,
          model,
          grade,
          notes: null
        });
        validCount++;
      }

      if (validRecords.length === 0) {
        statusEl.className = "status-message error";
        statusEl.textContent = `❌ 유효한 데이터가 없습니다. (검증 실패: ${invalidCount}개)`;
        return;
      }

      // 기존 데이터 삭제
      const { error: deleteError } = await window.supabaseClient
        .from("vehicles")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) {
        console.warn("Delete error:", deleteError);
      }

      // 새 데이터 삽입
      const { error } = await window.supabaseClient
        .from("vehicles")
        .insert(validRecords);

      checkError(error);

      statusEl.className = "status-message success";
      statusEl.textContent = `✅ 업로드 완료: ${validCount}개 성공, ${invalidCount}개 실패`;
      
      // 파일 입력 필드 초기화
      if (fileInput) {
        fileInput.value = "";
      }
      
      loadVehicles();
    } catch (e) {
      console.error("Excel processing error:", e);
      statusEl.className = "status-message error";
      statusEl.textContent = "❌ 엑셀 처리 중 오류가 발생했습니다: " + (e.message || "알 수 없는 오류");
    }
  };

  reader.readAsArrayBuffer(fileInput.files[0]);
}

// 전체 삭제
async function clearAllData() {
  if (!confirm("저장된 모든 차량 데이터를 삭제하시겠습니까?")) return;

  await waitForSupabase();
  
  if (!window.supabaseClient) {
    alert("데이터베이스 연결에 실패했습니다.");
    return;
  }

  try {
    const { error } = await window.supabaseClient
      .from("vehicles")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    checkError(error);
    alert("모든 데이터가 삭제되었습니다.");
    loadVehicles();
  } catch (e) {
    console.error("Failed to delete:", e);
    alert("데이터 삭제 중 오류가 발생했습니다.");
  }
}

// 수정 모달 열기
async function openEditModal(id) {
  await waitForSupabase();
  
  const vehicle = vehicles.find(v => v.id === id);
  if (!vehicle) {
    alert("차량 정보를 찾을 수 없습니다.");
    return;
  }

  document.getElementById("editId").value = vehicle.id;
  document.getElementById("editManufacturer").value = vehicle.manufacturer || "";
  document.getElementById("editModelName").value = vehicle.model || "";
  document.getElementById("editVehicleClass").value = vehicle.grade || "";
  document.getElementById("editMemo").value = vehicle.notes || "";

  document.getElementById("editModal").classList.add("active");
}

// 수정 모달 닫기
function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
  document.getElementById("editForm").reset();
}

// 차량 저장
async function saveVehicle(event) {
  event.preventDefault();
  await waitForSupabase();

  if (!window.supabaseClient) {
    alert("데이터베이스 연결에 실패했습니다.");
    return;
  }

  try {
    const id = document.getElementById("editId").value;
    const manufacturer = document.getElementById("editManufacturer").value.trim();
    const model = document.getElementById("editModelName").value.trim();
    const grade = document.getElementById("editVehicleClass").value.trim();
    const notes = document.getElementById("editMemo").value.trim();

    if (!manufacturer || !model) {
      alert("제조사와 차량명은 필수 입력 항목입니다.");
      return;
    }

    if (!validateGrade(grade)) {
      alert("차급은 '소형', '중형', '대형' 중 하나여야 합니다.");
      return;
    }

    const { error } = await window.supabaseClient
      .from("vehicles")
      .update({
        manufacturer,
        model,
        grade,
        notes: notes || null
      })
      .eq("id", id);

    checkError(error);
    alert("저장되었습니다.");
    closeEditModal();
    loadVehicles();
  } catch (e) {
    console.error("Failed to save vehicle:", e);
    alert("저장 중 오류가 발생했습니다.");
  }
}
