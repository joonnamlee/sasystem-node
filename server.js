const express = require('express');
const path = require('path');

const app = express();

// Render에서 제공하는 PORT 사용 (필수)
const PORT = process.env.PORT || 10000;

// 정적 파일 서빙 (현재 dashboard 폴더 기준)
app.use(express.static(__dirname));

// HTML 응답에 캐시 방지 헤더 추가
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// 기본 진입점 - dashboard.html 반환
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// dashboard.html 직접 접근
app.get('/dashboard.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// fallback (SPA 대응) - dashboard.html 반환
app.get('*', (req, res) => {
  // 정적 파일 요청은 express.static이 처리하므로, 여기서는 HTML만 처리
  if (req.path.endsWith('.html') || !req.path.includes('.')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  } else {
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from: ${__dirname}`);
  console.log(`Dashboard available at: http://localhost:${PORT}/`);
});
