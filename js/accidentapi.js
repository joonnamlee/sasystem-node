// Supabase client 준비 확인
if (!window.__supabaseReady || !window.supabaseClient) {
  console.warn('Supabase client not ready - accidentApi deferred');
  // 함수 정의는 계속 진행하되, 실행 시점에 체크
}

window.API = window.API || {};
console.log('accidentApi.js 로드됨');

// Timestamp 필드 정규화 함수 (빈 문자열을 null로 변환)
function normalizeTimestamp(value) {
  if (!value || value === '') return null;
  return value;
}

function checkError(error) {
  if (error) {
    console.error('Supabase error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // More detailed error messages
    let errorMessage = "데이터 저장 오류: ";
    if (error.message) {
      errorMessage += error.message;
    } else if (error.code) {
      errorMessage += `오류 코드: ${error.code}`;
    } else {
      errorMessage += "알 수 없는 오류가 발생했습니다.";
    }
    
    // Check for network errors
    if (error.message && error.message.includes('fetch')) {
      errorMessage += "\n\n네트워크 연결을 확인해주세요. Supabase 서버에 연결할 수 없습니다.";
    }
    
    alert(errorMessage);
    throw error;
  }
}

// Insert or Update (UPSERT) accident record by unique key: case_no
window.insertAccidentRecord = async function(data) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const now = new Date().toISOString();

  // case_no(접수번호) 정규화: 어떤 이름으로 들어와도 case_no로 통일
  const caseNo =
    data.case_no ||
    data.receipt_number ||
    data.receiptNumber ||
    data.caseNo;

  if (!caseNo) {
    throw new Error("case_no(접수번호)가 없습니다.");
  }

  // 문자열인 경우 trim 처리
  const caseNoValue = typeof caseNo === 'string' ? caseNo.trim() : caseNo;

  // payload 구성 (기존 컬럼명 유지 + case_no 확실히 포함)
  const payload = {
    case_no: caseNoValue,

    // 기존 매핑 유지
    receipt_number: caseNoValue, // 기존 컬럼명 유지 (하위 호환성)
    accident_time: normalizeTimestamp(data.accident_time || data.accident_date || data.accidentTime || null),
    customer_name: data.customer_name || data.customerName || null,
    phone: data.phone || null,
    car_number: data.car_number || data.car_no || data.carNumber || null,
    vin: data.vin || null,
    car_model: data.car_model || data.carModel || null,
    insurer: data.insurer || data.insurance || null,
    insurance: data.insurance || data.insurer || null,
    damage_type: data.damage_type || data.damageType || null,
    accident_location: data.accident_location || data.accidentLocation || null,
    manager: data.manager || null,
    manager_id: data.manager_id || null,
    manager_name: data.manager_name || null,
    deductible: data.deductible || null,
    deductible_pay_type: data.deductible_pay_type || data.deductible_type || data.deductiblePayType || null,
    assigned_workshop_name: data.assigned_workshop_name || null,
    assigned_workshop_address: data.assigned_workshop_address || null,
    assigned_workshop_phone: data.assigned_workshop_phone || null,
    memo: data.memo || null,
    status: (data.status && window.normalizeStatus) ? window.normalizeStatus(data.status) : "접수완료",
    status_priority: (() => {
      const normalizedStatus = (data.status && window.normalizeStatus) ? window.normalizeStatus(data.status) : "접수완료";
      return (window.ACCIDENT_STATUS_PRIORITY && window.ACCIDENT_STATUS_PRIORITY[normalizedStatus]) || 5;
    })(),
    is_deleted: false,

    // 생성/수정 시간
    updated_at: normalizeTimestamp(now),
    // created_at은 신규일 때만 의미 있지만 upsert에서도 들어가도 무방(원하면 조건 처리 가능)
    created_at: normalizeTimestamp(data.created_at || now),
  };

  const { data: saved, error } = await supabase
    .from("accident_records")
    .upsert(payload, { onConflict: "case_no" })   // ✅ 중복이면 update로 전환
    .select()
    .single();

  if (error) {
    checkError(error);
    throw error;
  }
  
  console.log("✅ UPSERT 성공:", saved);
  return saved;
}

// Fetch all accident records (excluding soft-deleted) - Legacy function for backward compatibility
window.fetchAccidentRecords = async function() {
  return await window.fetchAccidentRecordsPaginated({});
}

// Fetch accident records with server-side pagination and filtering
window.fetchAccidentRecordsPaginated = async function(options = {}) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const {
    page = 1,
    limit = 30,
    status = null,
    startDate = null,
    endDate = null,
    insurer = null,
    workshop = null,
    manager = null,
    search = null,
    excludeClosed = false, // 기본: 전체 상태 포함
    defaultLastDays = null // 기본: 기간 제한 없음 (데이터 표시 안정화)
  } = options;

  let query = supabase
    .from("accident_records")
    .select(`
      id,
      case_no,
      receipt_number,
      accident_time,
      incident_date,
      customer_name,
      phone,
      car_number,
      car_no,
      car_model,
      accident_location,
      insurance,
      insurer,
      manager,
      manager_id,
      manager_name,
      assigned_workshop_name,
      assigned_workshop_address,
      assigned_workshop_phone,
      status,
      status_priority,
      created_at,
      updated_at,
      vin,
      deductible,
      deductible_type,
      deductible_pay_type,
      damage_type,
      memo
    `, { count: 'exact' })
    .eq("is_deleted", false);

  // 기본 조회 조건: 기간 제한 없음 (데이터 표시 안정화)
  // 필터가 명시적으로 설정된 경우에만 기간 제한 적용
  // if (!startDate && !endDate && defaultLastDays) {
  //   const defaultStartDate = new Date();
  //   defaultStartDate.setDate(defaultStartDate.getDate() - defaultLastDays);
  //   defaultStartDate.setHours(0, 0, 0, 0);
  //   query = query.gte('incident_date', defaultStartDate.toISOString());
  // }

  // 날짜 필터
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    query = query.gte('incident_date', start.toISOString());
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte('incident_date', end.toISOString());
  }

  // 상태 필터
  if (status) {
    if (status === '미정산') {
      // 정산대기 이전 상태 전체
      query = query.in('status', ['접수완료', '배정완료', '시공예정', '시공완료']);
    } else {
      query = query.eq('status', status);
    }
  } else if (excludeClosed) {
    // 기본 조회에서 종료 상태 제외
    query = query.neq('status', '종료');
  }

  // 보험사 필터
  if (insurer) {
    query = query.eq('insurer', insurer);
  }

  // 시공점 필터
  if (workshop) {
    query = query.eq('assigned_workshop_name', workshop);
  }

  // 담당자 필터
  if (manager) {
    query = query.eq('manager', manager);
  }

  // 검색 필터 (접수번호, 차량번호, 고객명, 연락처)
  if (search) {
    const searchTerm = search.trim();
    query = query.or(`case_no.ilike.%${searchTerm}%,receipt_number.ilike.%${searchTerm}%,car_no.ilike.%${searchTerm}%,car_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
  }

  // 정렬: status_priority 우선, 그 다음 created_at DESC
  // status_priority 컬럼이 있으면 사용, 없으면 created_at만 사용
  query = query.order('status_priority', { ascending: true, nullsFirst: false })
               .order('created_at', { ascending: false });

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  // 디버깅: 쿼리 파라미터 로그
  console.log('=== fetchAccidentRecordsPaginated 쿼리 파라미터 ===');
  console.log('page:', page, 'limit:', limit, 'from:', from, 'to:', to);
  console.log('status:', status, 'excludeClosed:', excludeClosed, 'defaultLastDays:', defaultLastDays);
  console.log('startDate:', startDate, 'endDate:', endDate);
  console.log('insurer:', insurer, 'workshop:', workshop, 'manager:', manager, 'search:', search);

  const { data, error, count } = await query;

  // 디버깅: 쿼리 결과 로그
  console.log('=== 쿼리 결과 ===');
  console.log('data 개수:', data?.length || 0);
  console.log('count (전체):', count);
  console.log('error:', error);
  if (error) {
    console.error('쿼리 오류 상세:', error);
  }
  if (data && data.length > 0) {
    console.log('첫 번째 레코드 샘플:', data[0]);
  }

  checkError(error);
  
  // 임시: 상태 우선순위 정렬 제거 - 단순히 created_at DESC만 적용
  // 데이터 조회 확인 후 정렬 로직 복원 예정
  
  return {
    data: data || [],
    count: count || 0,
    page: page,
    limit: limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

// Fetch all records for Excel export (with filters, no pagination)
window.fetchAccidentRecordsForExport = async function(options = {}) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const {
    status = null,
    startDate = null,
    endDate = null,
    insurer = null,
    workshop = null,
    manager = null,
    search = null
  } = options;

  let query = supabase
    .from("accident_records")
    .select(`
      id,
      case_no,
      receipt_number,
      accident_time,
      incident_date,
      customer_name,
      phone,
      car_number,
      car_no,
      car_model,
      accident_location,
      insurance,
      insurer,
      manager,
      manager_id,
      manager_name,
      assigned_workshop_name,
      assigned_workshop_address,
      assigned_workshop_phone,
      status,
      created_at,
      updated_at,
      vin,
      deductible,
      deductible_type,
      deductible_pay_type,
      damage_type,
      memo
    `)
    .eq("is_deleted", false);

  // 날짜 필터
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    query = query.gte('incident_date', start.toISOString());
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte('incident_date', end.toISOString());
  }

  // 상태 필터
  if (status) {
    if (status === '미정산') {
      query = query.in('status', ['접수완료', '배정완료', '시공예정', '시공완료']);
    } else {
      query = query.eq('status', status);
    }
  }

  // 보험사 필터
  if (insurer) {
    query = query.eq('insurer', insurer);
  }

  // 시공점 필터
  if (workshop) {
    query = query.eq('assigned_workshop_name', workshop);
  }

  // 담당자 필터
  if (manager) {
    query = query.eq('manager', manager);
  }

  // 검색 필터
  if (search) {
    const searchTerm = search.trim();
    query = query.or(`case_no.ilike.%${searchTerm}%,receipt_number.ilike.%${searchTerm}%,car_no.ilike.%${searchTerm}%,car_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
  }

  // 정렬: 단순히 created_at DESC만 적용 (상태 우선순위 정렬 임시 제거)
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  checkError(error);
  return data || [];
}

// Update an existing accident record
window.updateAccidentRecord = async function(caseNo, fields) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const updateData = {
    ...fields,
    updated_at: normalizeTimestamp(new Date().toISOString()),
  };

  // Use case_no (unique key) for update
  // Only update non-deleted records
  const { data, error } = await supabase
    .from("accident_records")
    .update(updateData)
    .eq("case_no", caseNo)
    .eq("is_deleted", false)
    .select()
    .single();

  checkError(error);
  return data;
}

// Upsert (insert or update) an accident record by unique key: case_no
window.saveAccidentRecord = async function(data) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const now = new Date().toISOString();

  // case_no(접수번호) 정규화: 어떤 이름으로 들어와도 case_no로 통일
  const caseNo =
    data.case_no ||
    data.receipt_number ||
    data.receiptNumber ||
    data.caseNo;

  if (!caseNo) {
    throw new Error("case_no(접수번호)가 없습니다.");
  }

  // 문자열인 경우 trim 처리
  const caseNoValue = typeof caseNo === 'string' ? caseNo.trim() : caseNo;

  // payload 구성 (기존 컬럼명 유지 + case_no 확실히 포함)
  const payload = {
    case_no: caseNoValue,

    // 기존 매핑 유지
    receipt_number: caseNoValue, // 기존 컬럼명 유지 (하위 호환성)
    accident_time: normalizeTimestamp(data.accident_time || data.accident_date || data.accidentTime || null),
    customer_name: data.customer_name || data.customerName || null,
    phone: data.phone || null,
    car_number: data.car_number || data.car_no || data.carNumber || null,
    vin: data.vin || null,
    car_model: data.car_model || data.carModel || null,
    insurer: data.insurer || data.insurance || null,
    insurance: data.insurance || data.insurer || null,
    damage_type: data.damage_type || data.damageType || null,
    accident_location: data.accident_location || data.accidentLocation || null,
    manager: data.manager || null,
    manager_id: data.manager_id || null,
    manager_name: data.manager_name || null,
    deductible: data.deductible || null,
    deductible_pay_type: data.deductible_pay_type || data.deductible_type || data.deductiblePayType || null,
    assigned_workshop_name: data.assigned_workshop_name || null,
    assigned_workshop_address: data.assigned_workshop_address || null,
    assigned_workshop_phone: data.assigned_workshop_phone || null,
    memo: data.memo || null,
    status: (data.status && window.normalizeStatus) ? window.normalizeStatus(data.status) : "접수완료",
    status_priority: (() => {
      const normalizedStatus = (data.status && window.normalizeStatus) ? window.normalizeStatus(data.status) : "접수완료";
      return (window.ACCIDENT_STATUS_PRIORITY && window.ACCIDENT_STATUS_PRIORITY[normalizedStatus]) || 5;
    })(),
    is_deleted: false,

    // 생성/수정 시간
    updated_at: normalizeTimestamp(now),
    // created_at은 신규일 때만 의미 있지만 upsert에서도 들어가도 무방(원하면 조건 처리 가능)
    created_at: normalizeTimestamp(data.created_at || now),
  };

  const { data: saved, error } = await supabase
    .from("accident_records")
    .upsert(payload, { onConflict: "case_no" })   // ✅ 중복이면 update로 전환
    .select()
    .single();

  if (error) {
    checkError(error);
    throw error;
  }
  
  console.log("✅ UPSERT 성공:", saved);
  return saved;
}

// Load accident by case number (receipt number)
window.loadAccidentByReceiptNumber = async function(caseNo) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (!caseNo) {
    console.warn("loadAccidentByReceiptNumber: caseNo is empty");
    return null;
  }

  // Trim and convert to string
  const receiptNumber = String(caseNo).trim();
  
  console.log("[loadAccidentByReceiptNumber] 조회 시작, receiptNumber:", receiptNumber);
  console.log("[loadAccidentByReceiptNumber] receiptNumber 공백 여부:", receiptNumber === '' ? '공백' : '값 있음');

  // receipt_number와 case_no 중 하나라도 일치하면 조회
  // Only load non-deleted records
  const { data, error } = await supabase
    .from("accident_records")
    .select("*, assigned_workshop_name, assigned_workshop_address, assigned_workshop_phone")
    .or(`receipt_number.eq.${receiptNumber},case_no.eq.${receiptNumber}`)
    .eq("is_deleted", false)
    .maybeSingle();

  // maybeSingle() returns null for no rows, so only check for actual errors
  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which is expected when record doesn't exist
    checkError(error);
    return null;
  }

  return data || null;
}

// Soft delete an accident record by ID
window.deleteAccidentRecord = async function(recordId) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (!recordId) {
    throw new Error("Record ID is required for deletion");
  }

  // Soft delete: update is_deleted and deleted_at instead of physical deletion
  const { error } = await supabase
    .from("accident_records")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
    .eq("id", recordId);

  if (error) {
    checkError(error);
    return;
  }

  return true;
}

// Legacy function name for backward compatibility
window.loadAllAccidents = async function() {
  return await window.fetchAccidentRecords();
};

// 상태 변경 함수
window.updateAccidentStatus = async function (caseNo, newStatus) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not ready');
  }

  if (!caseNo || !newStatus) {
    throw new Error('caseNo 또는 status가 비어있습니다.');
  }

  // status_priority 계산 (statusConfig.js의 ACCIDENT_STATUS_PRIORITY 사용)
  const statusPriority = (window.ACCIDENT_STATUS_PRIORITY && window.ACCIDENT_STATUS_PRIORITY[newStatus]) || 5;

  const { data, error } = await supabase
    .from('accident_records')
    .update({
      status: newStatus,
      status_priority: statusPriority,
      updated_at: normalizeTimestamp(new Date().toISOString())
    })
    .eq('case_no', caseNo)
    .eq('is_deleted', false)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 통계 대시보드 집계 함수
window.fetchDashboardStats = async function(startDate, endDate) {
  const supabase = window.supabase || window.supabaseClient;
  
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('accident_records')
    .select('status, created_at')
    .eq('is_deleted', false);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate + ' 23:59:59');
  }

  const { data, error } = await query;

  if (error) throw error;

  const stats = {
    total: data ? data.length : 0,
    new: 0,
    progress: 0,
    done: 0
  };

  if (data) {
    data.forEach(row => {
      if (row.status === '접수됨') {
        stats.new++;
      } else if (['배정완료', '작업중'].includes(row.status)) {
        stats.progress++;
      } else if (['작업완료', '정산완료'].includes(row.status)) {
        stats.done++;
      }
    });
  }

  return stats;
};

window.API.saveAccident = window.saveAccidentRecord;
window.API.updateAccidentStatus = window.updateAccidentStatus;
window.API.fetchDashboardStats = window.fetchDashboardStats;


console.log('API 객체 상태:', window.API);
