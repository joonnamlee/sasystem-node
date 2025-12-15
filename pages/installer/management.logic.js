let geocoder = null;
let workshops = [];

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

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();
  
  // 카카오맵 SDK 로드
  if (typeof kakao !== 'undefined' && kakao.maps && typeof kakao.maps.load === 'function') {
    kakao.maps.load(() => {
      geocoder = new kakao.maps.services.Geocoder();
      loadWorkshops();
    });
  } else {
    console.warn('Kakao Maps SDK not loaded');
    loadWorkshops();
  }
});

// 시공점 목록 로드
async function loadWorkshops() {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    document.getElementById("workshopList").innerHTML = 
      '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #dc2626;">데이터베이스 연결 실패</td></tr>';
    return;
  }

  try {
    const activeFilter = document.getElementById("filterActive").value;
    const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();

    let query = window.supabaseClient
      .from("installer_locations")
      .select("*");

    if (activeFilter === "true" || activeFilter === "false") {
      query = query.eq("is_active", activeFilter === "true");
    }

    const { data, error } = await query
      .order("priority", { ascending: true })
      .order("name", { ascending: true });

    checkError(error);

    workshops = data || [];

    // 검색 필터링
    if (searchTerm) {
      workshops = workshops.filter(w => 
        (w.name || "").toLowerCase().includes(searchTerm) ||
        (w.address || "").toLowerCase().includes(searchTerm) ||
        (w.phone || "").toLowerCase().includes(searchTerm)
      );
    }

    renderWorkshops();
  } catch (e) {
    console.error("Failed to load workshops:", e);
    document.getElementById("workshopList").innerHTML = 
      '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #dc2626;">데이터 로드 실패</td></tr>';
  }
}

// 시공점 목록 렌더링
function renderWorkshops() {
  const tbody = document.getElementById("workshopList");
  const cardList = document.getElementById("mWorkshopCardList");
  
  if (workshops.length === 0) {
    tbody.innerHTML = 
      '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #9ca3af;">시공점이 없습니다.</td></tr>';
    if (cardList) {
      cardList.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">시공점이 없습니다.</div>';
    }
    updateMobileFixedActions();
    return;
  }

  // 데스크톱 테이블 렌더링
  tbody.innerHTML = workshops.map(w => {
    const hasCoords = w.lat != null && w.lng != null;
    const coordsStatus = hasCoords 
      ? `<span class="badge badge-active">좌표 있음</span>` 
      : `<span class="badge badge-no-coords">좌표 없음</span>`;
    
    const activeStatus = w.is_active 
      ? `<span class="badge badge-active">활성</span>` 
      : `<span class="badge badge-inactive">비활성</span>`;

    // 주소를 JSON.stringify로 안전하게 인코딩
    const safeAddress = w.address ? JSON.stringify(w.address) : "";
    const regenerateButton = (!hasCoords && w.address) 
      ? '<button class="btn btn-sm btn-regenerate" onclick="regenerateCoords(' + JSON.stringify(w.id) + ', ' + safeAddress + ')">좌표 재생성</button>' 
      : '';
    
    return `
      <tr data-workshop-id="${w.id}">
        <td>${escapeHtml(w.name || "")}</td>
        <td>${escapeHtml(w.address || "")}</td>
        <td>${escapeHtml(w.phone || "")}</td>
        <td>${coordsStatus}</td>
        <td>${activeStatus}</td>
        <td>${w.priority || 0}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(w.memo || "")}
        </td>
        <td>
          <button class="btn btn-sm btn-edit" onclick="openEditModal('${w.id}')">수정</button>
          <button class="btn btn-sm btn-toggle ${w.is_active ? '' : 'inactive'}" 
                  onclick="toggleActive('${w.id}', ${!w.is_active})">
            ${w.is_active ? '비활성화' : '활성화'}
          </button>
          ${regenerateButton}
        </td>
      </tr>
    `;
  }).join('');

  // 모바일 카드 리스트 렌더링
  if (cardList) {
    cardList.innerHTML = workshops.map(w => {
      const hasCoords = w.lat != null && w.lng != null;
      const coordsStatus = hasCoords 
        ? '<span class="badge badge-active">좌표 있음</span>' 
        : '<span class="badge badge-no-coords">좌표 없음</span>';
      
      const activeStatus = w.is_active 
        ? '<span class="badge badge-active">활성</span>' 
        : '<span class="badge badge-inactive">비활성</span>';

      const safeAddress = w.address ? JSON.stringify(w.address) : "";
      const regenerateButton = (!hasCoords && w.address) 
        ? '<button class="btn btn-sm btn-regenerate" onclick="regenerateCoords(' + JSON.stringify(w.id) + ', ' + safeAddress + ')" style="width: 100%; margin-top: 8px;">좌표 재생성</button>' 
        : '';

      return `
        <div class="m-card-item" data-workshop-id="${w.id}">
          <div class="m-card-header">${escapeHtml(w.name || "")}</div>
          <div class="m-card-row">
            <span class="m-card-label">주소</span>
            <span class="m-card-value">${escapeHtml(w.address || "")}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">전화번호</span>
            <span class="m-card-value">${escapeHtml(w.phone || "")}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">좌표</span>
            <span class="m-card-value">${coordsStatus}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">상태</span>
            <span class="m-card-value">${activeStatus}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">메모</span>
            <span class="m-card-value">${escapeHtml(w.memo || "")}</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-sm btn-edit" onclick="openEditModal('${w.id}')" style="flex: 1;">수정</button>
            <button class="btn btn-sm btn-toggle ${w.is_active ? '' : 'inactive'}" 
                    onclick="toggleActive('${w.id}', ${!w.is_active})" style="flex: 1;">
              ${w.is_active ? '비활성화' : '활성화'}
            </button>
          </div>
          ${regenerateButton}
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
    // 전체 시공점 데이터 조회 (활성/비활성 모두)
    const { data, error } = await window.supabaseClient
      .from("installer_locations")
      .select("*")
      .order("priority", { ascending: true })
      .order("name", { ascending: true });

    checkError(error);

    if (!data || data.length === 0) {
      alert("다운로드할 시공점 데이터가 없습니다.");
      return;
    }

    // 엑셀 데이터 생성 (순번은 1부터 재생성)
    const excelData = data.map((w, index) => ({
      순번: index + 1,
      상호: w.name || "",
      주소: w.address || "",
      전화번호: w.phone || ""
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // 컬럼 너비 설정 (선택사항)
    ws['!cols'] = [
      { wch: 8 },   // 순번
      { wch: 20 },  // 상호
      { wch: 40 },  // 주소
      { wch: 15 }   // 전화번호
    ];

    XLSX.utils.book_append_sheet(wb, ws, "시공점");

    // 파일명 생성 (YYYYMMDD 형식)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const filename = `installers_${year}${month}${day}.xlsx`;

    // 다운로드
    XLSX.writeFile(wb, filename);
    
    console.log(`[엑셀 다운로드] 완료: ${data.length}개 시공점, 파일명: ${filename}`);
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

  if (!geocoder) {
    alert("지도 서비스를 초기화할 수 없습니다. 페이지를 새로고침해주세요.");
    return;
  }

  statusEl.className = "status-message info";
  statusEl.style.display = "block";
  statusEl.textContent = "엑셀 처리 중... (주소 → 좌표 변환)";

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const rows = json.filter(r => r.주소 || r["주소"]);
      if (!rows.length) {
        statusEl.className = "status-message error";
        statusEl.textContent = "❌ '주소' 컬럼이 포함된 행이 없습니다.";
        return;
      }

      const resultStores = [];
      let idx = 0;
      let successCount = 0;
      let failCount = 0;

      function processNext() {
        if (idx >= rows.length) {
          finishUpload(resultStores, successCount, failCount);
          return;
        }

        const r = rows[idx++];
        const seq = r.순번 || r["순번"] || "";
        const name = r.상호 || r["상호"] || "";
        const address = r.주소 || r["주소"] || "";
        const phone = r.전화번호 || r["전화번호"] || "";

        if (!address) {
          resultStores.push({ seq, name, address, phone, lat: null, lng: null });
          failCount++;
          processNext();
          return;
        }

        geocoder.addressSearch(address, function(res, status) {
          if (status === kakao.maps.services.Status.OK && res && res[0]) {
            const lat = parseFloat(res[0].y);
            const lng = parseFloat(res[0].x);
            resultStores.push({ seq, name, address, phone, lat, lng });
            successCount++;
          } else {
            resultStores.push({ seq, name, address, phone, lat: null, lng: null });
            failCount++;
          }
          setTimeout(processNext, 80);
        });
      }

      processNext();
    } catch (e) {
      console.error("Excel processing error:", e);
      statusEl.className = "status-message error";
      statusEl.textContent = "❌ 엑셀 처리 중 오류가 발생했습니다.";
    }
  };

  reader.readAsArrayBuffer(fileInput.files[0]);
}

// 업로드 완료 처리
async function finishUpload(stores, successCount, failCount) {
  await waitForSupabase();
  const statusEl = document.getElementById("uploadStatus");

  if (!window.supabaseClient) {
    statusEl.className = "status-message error";
    statusEl.textContent = "❌ 데이터베이스 연결 실패";
    return;
  }

  try {
    // 기존 데이터 삭제
    const { error: deleteError } = await window.supabaseClient
      .from("installer_locations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.warn("Delete error:", deleteError);
    }

    // 새 데이터 삽입
    if (stores.length > 0) {
      const records = stores.map(s => ({
        seq: s.seq || "",
        name: s.name || "",
        address: s.address || "",
        phone: s.phone || "",
        lat: s.lat,
        lng: s.lng,
        is_active: true,
        priority: 0,
        memo: null
      }));

      const { error } = await window.supabaseClient
        .from("installer_locations")
        .insert(records);

      checkError(error);
    }

    statusEl.className = "status-message success";
    statusEl.textContent = `✅ 업로드 완료: ${successCount}개 좌표 변환 성공, ${failCount}개 실패`;
    
    // 파일 입력 필드 초기화
    const fileInput = document.getElementById("excelFile");
    if (fileInput) {
      fileInput.value = "";
    }
    
    loadWorkshops();
  } catch (e) {
    console.error("Failed to save:", e);
    statusEl.className = "status-message error";
    statusEl.textContent = "❌ 데이터 저장 중 오류가 발생했습니다.";
  }
}

// 전체 삭제
async function clearAllData() {
  if (!confirm("저장된 모든 시공점 데이터를 삭제하시겠습니까?")) return;

  await waitForSupabase();
  
  if (!window.supabaseClient) {
    alert("데이터베이스 연결에 실패했습니다.");
    return;
  }

  try {
    const { error } = await window.supabaseClient
      .from("installer_locations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    checkError(error);
    alert("모든 데이터가 삭제되었습니다.");
    loadWorkshops();
  } catch (e) {
    console.error("Failed to delete:", e);
    alert("데이터 삭제 중 오류가 발생했습니다.");
  }
}

// 활성/비활성 토글
async function toggleActive(id, newActive) {
  await waitForSupabase();
  
  if (!window.supabaseClient) {
    alert("데이터베이스 연결에 실패했습니다.");
    return;
  }

  try {
    const { error } = await window.supabaseClient
      .from("installer_locations")
      .update({ is_active: newActive })
      .eq("id", id);

    checkError(error);
    loadWorkshops();
  } catch (e) {
    console.error("Failed to toggle active:", e);
    alert("상태 변경 중 오류가 발생했습니다.");
  }
}

// 수정 모달 열기
async function openEditModal(id) {
  await waitForSupabase();
  
  const workshop = workshops.find(w => w.id === id);
  if (!workshop) {
    alert("시공점 정보를 찾을 수 없습니다.");
    return;
  }

  document.getElementById("editId").value = workshop.id;
  // 순번은 내부적으로만 유지, 사용자에게는 노출하지 않음
  document.getElementById("editName").value = workshop.name || "";
  document.getElementById("editAddress").value = workshop.address || "";
  document.getElementById("editPhone").value = workshop.phone || "";
  document.getElementById("editLat").value = workshop.lat || "";
  document.getElementById("editLng").value = workshop.lng || "";
  document.getElementById("editPriority").value = workshop.priority || 0;
  document.getElementById("editMemo").value = workshop.memo || "";

  updateCoordsStatus(workshop.lat, workshop.lng);
  document.getElementById("editModal").classList.add("active");
}

// 수정 모달 닫기
function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
  document.getElementById("editForm").reset();
}

// 좌표 상태 업데이트
function updateCoordsStatus(lat, lng) {
  const statusEl = document.getElementById("coordsStatus");
  if (lat != null && lng != null) {
    statusEl.className = "coords-status has-coords";
    statusEl.textContent = `✓ 좌표: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } else {
    statusEl.className = "coords-status no-coords";
    statusEl.textContent = "⚠ 좌표 없음 (주소로 좌표 찾기 버튼 사용)";
  }
}

// 주소로 좌표 찾기
function geocodeAddress() {
  const address = document.getElementById("editAddress").value.trim();
  if (!address) {
    alert("주소를 입력해주세요.");
    return;
  }

  if (!geocoder) {
    alert("지도 서비스를 초기화할 수 없습니다.");
    return;
  }

  geocoder.addressSearch(address, function(res, status) {
    if (status === kakao.maps.services.Status.OK && res && res[0]) {
      const lat = parseFloat(res[0].y);
      const lng = parseFloat(res[0].x);
      document.getElementById("editLat").value = lat;
      document.getElementById("editLng").value = lng;
      updateCoordsStatus(lat, lng);
      alert("좌표를 찾았습니다.");
    } else {
      alert("주소를 찾을 수 없습니다. 수동으로 좌표를 입력해주세요.");
    }
  });
}

// 주소 문자열 정제 (상세 주소 제거)
function cleanAddress(address) {
  if (!address) return "";
  
  // '~', '호', 층/호수 패턴 제거
  // 예: "서울시 강남구 테헤란로 123 3층 301호" → "서울시 강남구 테헤란로 123"
  let cleaned = address.trim();
  
  // 층/호수 패턴 제거 (예: "3층", "301호", "3-301", "301-1호" 등)
  cleaned = cleaned.replace(/\s*\d+층\s*/g, "");
  cleaned = cleaned.replace(/\s*\d+호\s*/g, "");
  cleaned = cleaned.replace(/\s*\d+-\d+호?\s*/g, "");
  cleaned = cleaned.replace(/\s*\d+-\d+-\d+호?\s*/g, "");
  
  // '~' 이후 제거
  const tildeIndex = cleaned.indexOf('~');
  if (tildeIndex !== -1) {
    cleaned = cleaned.substring(0, tildeIndex).trim();
  }
  
  // 연속된 공백 정리
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

// 좌표 재생성
async function regenerateCoords(id, addressJson) {
  // JSON.stringify로 인코딩된 주소를 파싱
  let address;
  try {
    address = typeof addressJson === 'string' ? JSON.parse(addressJson) : addressJson;
  } catch (e) {
    // JSON 파싱 실패 시 그대로 사용 (이미 문자열인 경우)
    address = addressJson;
  }
  
  if (!address || !address.trim()) {
    alert("주소가 없어서 좌표를 생성할 수 없습니다.");
    return;
  }

  if (!geocoder) {
    alert("지도 서비스를 초기화할 수 없습니다. 페이지를 새로고침해주세요.");
    return;
  }

  // 주소 정제
  const cleanedAddress = cleanAddress(address);
  console.log(`[좌표 재생성] 원본 주소: ${address}`);
  console.log(`[좌표 재생성] 정제 주소: ${cleanedAddress}`);

  if (!cleanedAddress) {
    alert("정제된 주소가 없어서 좌표를 생성할 수 없습니다.");
    return;
  }

  // 진행 중 표시
  const workshop = workshops.find(w => w.id === id);
  if (workshop) {
    const row = document.querySelector(`tr[data-workshop-id="${id}"]`);
    if (row) {
      const btn = row.querySelector('.btn-regenerate');
      if (btn) {
        btn.disabled = true;
        btn.textContent = "처리 중...";
      }
    }
  }

  try {
    // 카카오 주소 API 호출
    geocoder.addressSearch(cleanedAddress, async function(res, status) {
      await waitForSupabase();

      if (!window.supabaseClient) {
        alert("데이터베이스 연결에 실패했습니다.");
        restoreButton(id);
        return;
      }

      if (status === kakao.maps.services.Status.OK && res && res[0]) {
        const lat = parseFloat(res[0].y);
        const lng = parseFloat(res[0].x);
        
        console.log(`[좌표 재생성] 성공: ${lat}, ${lng}`);

        try {
          // DB 업데이트
          const { error } = await window.supabaseClient
            .from("installer_locations")
            .update({ lat, lng })
            .eq("id", id);

          if (error) {
            console.error("[좌표 재생성] DB 업데이트 실패:", error);
            alert("좌표는 찾았지만 저장 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
            restoreButton(id);
            return;
          }

          // 성공 메시지
          alert(`좌표를 성공적으로 생성했습니다.\n위도: ${lat.toFixed(6)}\n경도: ${lng.toFixed(6)}`);
          
          // 목록 새로고침
          loadWorkshops();
        } catch (e) {
          console.error("[좌표 재생성] 저장 오류:", e);
          alert("좌표 저장 중 오류가 발생했습니다.");
          restoreButton(id);
        }
      } else {
        // 실패 처리
        let errorMsg = "주소를 찾을 수 없습니다.";
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          errorMsg = "검색 결과가 없습니다. 주소를 확인해주세요.";
        } else if (status === kakao.maps.services.Status.ERROR) {
          errorMsg = "주소 검색 중 오류가 발생했습니다.";
        } else if (status === kakao.maps.services.Status.OVER_QUERY_LIMIT) {
          errorMsg = "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
        }
        
        console.error(`[좌표 재생성] 실패 (상태: ${status}): ${cleanedAddress}`);
        alert(`좌표 생성 실패\n\n${errorMsg}\n\n정제된 주소: ${cleanedAddress}`);
        restoreButton(id);
      }
    });
  } catch (e) {
    console.error("[좌표 재생성] 예외 발생:", e);
    alert("좌표 재생성 중 오류가 발생했습니다.");
    restoreButton(id);
  }
}

// 버튼 상태 복원
function restoreButton(id) {
  const workshop = workshops.find(w => w.id === id);
  if (workshop) {
    const row = document.querySelector(`tr[data-workshop-id="${id}"]`);
    if (row) {
      const btn = row.querySelector('.btn-regenerate');
      if (btn) {
        btn.disabled = false;
        btn.textContent = "좌표 재생성";
      }
    }
  }
}

// 시공점 저장
async function saveWorkshop(event) {
  event.preventDefault();
  await waitForSupabase();

  if (!window.supabaseClient) {
    alert("데이터베이스 연결에 실패했습니다.");
    return;
  }

  try {
    const id = document.getElementById("editId").value;
    const name = document.getElementById("editName").value.trim();
    const address = document.getElementById("editAddress").value.trim();
    const phone = document.getElementById("editPhone").value.trim();
    const lat = document.getElementById("editLat").value ? parseFloat(document.getElementById("editLat").value) : null;
    const lng = document.getElementById("editLng").value ? parseFloat(document.getElementById("editLng").value) : null;
    const priority = parseInt(document.getElementById("editPriority").value) || 0;
    const memo = document.getElementById("editMemo").value.trim();

    if (!name || !address) {
      alert("상호와 주소는 필수 입력 항목입니다.");
      return;
    }

    const { error } = await window.supabaseClient
      .from("installer_locations")
      .update({
        name,
        address,
        phone,
        lat,
        lng,
        priority,
        memo: memo || null
      })
      .eq("id", id);

    checkError(error);
    alert("저장되었습니다.");
    closeEditModal();
    loadWorkshops();
  } catch (e) {
    console.error("Failed to save workshop:", e);
    alert("저장 중 오류가 발생했습니다.");
  }
}

