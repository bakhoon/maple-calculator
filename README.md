# 어센틱 포스 MAX 계산기

## 실행

```
npm install
npm run dev
```

터미널에 나오는 주소(기본 http://localhost:5173)를 브라우저로 열면 됩니다.

## 테스트

```
npm test
```

## 구조

- `src/data.js`: 나무위키 어센틱 포스 테이블 (성장치, 메소, 스탯)
- `src/calc.js`: MAX 날짜 시뮬레이션
- `src/App.jsx`: 화면

입력값은 브라우저 localStorage에 자동 저장됩니다.
