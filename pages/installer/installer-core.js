// Installer Map Core Functions
// Used by embed.html for clean map-only view

let map, geocoder;
let shops = [];
let markers = [];
let infoWindows = [];
let customerMarker = null;
let currentResults = [];

/* ✅ HTML 이스케이프 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ✅ 거리 계산 */
function distanceMeters(lat1, lon1, lat2, lon2) {
  function toRad(v) { return v * Math.PI / 180; }
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ✅ 기존 마커 삭제 */
function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  infoWindows.forEach(iw => iw.close());
  markers = [];
  infoWindows = [];
  if (customerMarker) {
    customerMarker.setMap(null);
    customerMarker = null;
  }
}

/* ✅ 지도 초기화 및 데이터 로드 */
window.initInstallerMap = function() {
  // 지도 초기화
  map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 8
  });
  geocoder = new kakao.maps.services.Geocoder();

  // 저장된 데이터 로드
  const saved = localStorage.getItem("locations");
  if (saved) {
    shops = JSON.parse(saved);
  } else {
    shops = [];
  }
};

/* ✅ 검색 실행 - 가까운 지점 5곳 찾기 */
window.searchNearest = function() {
  const addrInput = document.getElementById("addressInput");
  if (!addrInput) {
    console.error("addressInput element not found");
    return;
  }

  const addr = addrInput.value.trim();
  if (!addr) {
    alert("주소를 입력해주세요.");
    addrInput.focus();
    return;
  }
  
  if (!shops.length) {
    alert("저장된 지점 데이터가 없습니다. 먼저 지점 데이터를 업로드해주세요.");
    return;
  }

  // 카카오맵 API 및 geocoder 확인
  if (typeof kakao === 'undefined' || !kakao.maps) {
    alert("지도 API를 불러올 수 없습니다. 페이지를 새로고침해주세요.");
    return;
  }

  if (!geocoder) {
    try {
      geocoder = new kakao.maps.services.Geocoder();
    } catch (e) {
      console.error('Geocoder 초기화 실패:', e);
      alert("지도 서비스를 초기화할 수 없습니다. 페이지를 새로고침해주세요.");
      return;
    }
  }

  geocoder.addressSearch(addr, function (res, status) {
    let errorMessage = '';
    
    if (status === kakao.maps.services.Status.OK) {
      // 성공 - 계속 진행
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
      errorMessage = '검색 결과가 없습니다. 주소를 다시 확인해주세요.';
    } else if (status === kakao.maps.services.Status.ERROR) {
      errorMessage = '주소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else if (status === kakao.maps.services.Status.OVER_QUERY_LIMIT) {
      errorMessage = '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else {
      errorMessage = `주소를 찾을 수 없습니다. (오류 코드: ${status})`;
    }

    if (status !== kakao.maps.services.Status.OK) {
      console.error('주소 검색 실패:', status, addr);
      alert(errorMessage);
      return;
    }

    if (!res || res.length === 0) {
      alert("주소를 찾을 수 없습니다. 다른 형식으로 주소를 입력해보세요.");
      return;
    }

    const clat = parseFloat(res[0].y);
    const clng = parseFloat(res[0].x);

    // 고객 주소 마커 생성 (빨간색)
    if (customerMarker) {
      customerMarker.setMap(null);
      customerMarker = null;
    }
    
    // 빨간색 마커 이미지 생성
    const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
    const imageSize = new kakao.maps.Size(24, 35);
    const imageOption = { offset: new kakao.maps.Point(12, 35) };
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
    
    customerMarker = new kakao.maps.Marker({
      map: map,
      position: new kakao.maps.LatLng(clat, clng),
      image: markerImage,
      zIndex: 1000
    });
    
    // 고객 위치 인포윈도우 생성
    const customerInfoContent = `
      <div style="padding:12px; min-width:180px; font-family:Pretendard, sans-serif;">
        <div style="font-weight:600; font-size:14px; color:#ef4444; margin-bottom:4px;">
          📍 고객 위치
        </div>
        <div style="font-size:12px; color:#718096;">
          ${escapeHtml(addr)}
        </div>
      </div>
    `;
    
    const customerInfoWindow = new kakao.maps.InfoWindow({
      content: customerInfoContent,
      removable: false
    });
    
    // 고객 마커에 마우스 오버 시 인포윈도우 표시
    kakao.maps.event.addListener(customerMarker, 'mouseover', function() {
      customerInfoWindow.open(map, customerMarker);
    });
    
    kakao.maps.event.addListener(customerMarker, 'mouseout', function() {
      customerInfoWindow.close();
    });

    // 좌표가 있는 지점만 필터링
    const validShops = shops.filter(s => s.lat && s.lng);
    
    const result = validShops
      .map(s => ({
        ...s,
        distance: distanceMeters(clat, clng, s.lat, s.lng)
      }))
      .sort((a,b) => a.distance - b.distance)
      .slice(0,5);

    // 지도 중심을 고객 주소로 이동
    map.setCenter(new kakao.maps.LatLng(clat, clng));
    map.setLevel(6);
    
    if (result.length === 0) {
      // 지점 마커만 삭제하고 고객 마커는 유지
      markers.forEach(m => m.setMap(null));
      infoWindows.forEach(iw => iw.close());
      markers = [];
      infoWindows = [];
      // customerMarker는 이미 생성되어 있으므로 그대로 유지
      return;
    }

    currentResults = result;

    /* ✅ 지도 마커 갱신 (고객 마커는 유지) */
    markers.forEach(m => m.setMap(null));
    infoWindows.forEach(iw => iw.close());
    markers = [];
    infoWindows = [];

    result.forEach((s, i) => {
      const marker = new kakao.maps.Marker({
        map: map,
        position: new kakao.maps.LatLng(s.lat, s.lng)
      });
      
      // 인포윈도우 생성
      const phone = s.전화번호 || s.phone || s.tel || '';
      const name = s.상호 || s.name || s.상호명 || '이름 없음';
      const address = s.주소 || s.address || '';
      const distance = (s.distance/1000).toFixed(2);
      
      const infoContent = `
        <div style="padding:12px; min-width:200px; font-family:Pretendard, sans-serif;">
          <div style="font-weight:600; font-size:14px; color:#1a202c; margin-bottom:8px;">
            ${escapeHtml(name)}
          </div>
          ${address ? `<div style="font-size:12px; color:#718096; margin-bottom:4px;">
            📍 ${escapeHtml(address)}
          </div>` : ''}
          ${phone ? `<div style="font-size:12px; color:#718096; margin-bottom:4px;">
            📞 ${escapeHtml(phone)}
          </div>` : ''}
          <div style="font-size:13px; font-weight:600; color:#3b82f6; margin-top:8px; padding-top:8px; border-top:1px solid #e1e8ed;">
            거리: ${distance}km
          </div>
        </div>
      `;
      
      const infoWindow = new kakao.maps.InfoWindow({
        content: infoContent,
        removable: false
      });
      
      // 마커에 마우스 오버 시 인포윈도우 표시
      kakao.maps.event.addListener(marker, 'mouseover', function() {
        infoWindow.open(map, marker);
      });
      
      // 마커에서 마우스 아웃 시 인포윈도우 닫기
      kakao.maps.event.addListener(marker, 'mouseout', function() {
        infoWindow.close();
      });
      
      markers.push(marker);
      infoWindows.push(infoWindow);
    });
  });
};

