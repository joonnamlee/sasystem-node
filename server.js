const express = require('express');
const path = require('path');

const app = express();

// Render에서 제공하는 PORT 사용 (필수)
const PORT = process.env.PORT || 10000;

// 정적 파일 서빙 (현재 구조 기준)
app.use(express.static(__dirname));

// 기본 진입점
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// fallback (SPA 대응)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
