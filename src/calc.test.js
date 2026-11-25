import assert from "node:assert/strict";
import {
  CUM_GROWTH,
  CUM_MESO,
  NEED_GROWTH,
  NEED_MESO,
  TOTAL_GROWTH,
  STAT_AT,
} from "./data.js";
import { simulateSymbol, parseDate, toDateStr } from "./calc.js";

// 1) 수식(나무위키)과 하드코딩된 표가 일치하는지 확인
for (let n = 1; n <= 10; n++) {
  assert.equal(NEED_GROWTH[n - 1], 9 * n * n + 20 * n, `성장치 n=${n}`);
  const f = (x) => Math.floor(Math.round(x * 1e6) / 1e6) * 100000;
  assert.equal(NEED_MESO.cer[n - 1], f(-5.4 * n ** 3 + 106.8 * n ** 2 + 264 * n), `세르 n=${n}`);
  assert.equal(NEED_MESO.arc[n - 1], f(-5.4 * n ** 3 + 123 * n ** 2 + 300 * n), `아르 n=${n}`);
  assert.equal(NEED_MESO.odi[n - 1], f(-5.4 * n ** 3 + 139.2 * n ** 2 + 336 * n), `오디 n=${n}`);
  assert.equal(NEED_MESO.dow[n - 1], f(-5.4 * n ** 3 + 155.4 * n ** 2 + 372 * n), `도원경 n=${n}`);
  assert.equal(NEED_MESO.art[n - 1], f(-5.4 * n ** 3 + 171.6 * n ** 2 + 408 * n), `아르테리아 n=${n}`);
  assert.equal(NEED_MESO.car[n - 1], f(-5.4 * n ** 3 + 187.8 * n ** 2 + 444 * n), `카르시온 n=${n}`);
  assert.equal(NEED_MESO.tal[n - 1], f(-5.4 * n ** 3 + 346.2 * n ** 2 + 796 * n), `탈라하트 n=${n}`);
  assert.equal(NEED_MESO.gea[n - 1], f(-5.4 * n ** 3 + 427.2 * n ** 2 + 976 * n), `기어드락 n=${n}`);
}
for (let n = 1; n <= 11; n++) {
  assert.equal(STAT_AT.normal[n - 1], 100 * (2 * n + 3));
  // 제논 11레벨은 표에 1550으로 적혀 있어(수식상 1650) 표 값을 그대로 사용한다
  if (n < 11) assert.equal(STAT_AT.xenon[n - 1], 66 * (2 * n + 3));
  assert.equal(STAT_AT.da[n - 1], 2100 * (2 * n + 3));
}

// 2) 표의 누적값과 일치하는지 확인
assert.deepEqual(CUM_GROWTH.slice(0, 5), [0, 29, 105, 246, 470]);
assert.equal(TOTAL_GROWTH, 4565);
assert.equal(CUM_MESO.cer[10], 3930100000);
assert.equal(CUM_MESO.arc[10], 4751600000);
assert.equal(CUM_MESO.odi[10], 5573300000);
assert.equal(CUM_MESO.dow[10], 6395000000);
assert.equal(CUM_MESO.art[10], 7216900000);
assert.equal(CUM_MESO.car[10], 8038600000);
assert.equal(CUM_MESO.dow[4], 784000000);
assert.equal(CUM_MESO.car[6], 2403100000);
assert.equal(CUM_MESO.car[7], 3448900000);
assert.equal(CUM_MESO.tal[10], 16072800000);
assert.equal(CUM_MESO.gea[10], 20181300000);
assert.equal(CUM_MESO.gea[4], 2203400000);

// 3) 시뮬레이션: 매일 10, 주간 0 -> 4565 / 10 = 457일째(인덱스 456)
const start = parseDate("2026-11-24");
const r = simulateSymbol({
  symbolKey: "cer",
  level: 1,
  progress: 0,
  daily: 10,
  weekly: 0,
  startDate: start,
  includeToday: true,
});
assert.equal(r.days, 456);
assert.equal(r.levelUps.length, 10);
assert.equal(r.levelUps[0].level, 2);
// 첫 레벨업: 29 성장치 -> 3일째(인덱스 2)
assert.equal(toDateStr(r.levelUps[0].date), "2026-11-26");

// 오늘 제외 시 하루 늦어짐
const r2 = simulateSymbol({
  symbolKey: "cer",
  level: 1,
  progress: 0,
  daily: 10,
  weekly: 0,
  startDate: start,
  includeToday: false,
});
assert.equal(r2.days, 457);

// 이미 MAX
const r3 = simulateSymbol({
  symbolKey: "odi",
  level: 11,
  progress: 0,
  daily: 10,
  weekly: 0,
  startDate: start,
  includeToday: true,
});
assert.equal(r3.isMax, true);

// 레벨 중간 진행분 반영: 레벨 10, 성장치 1000 -> 필요 1100, 남은 100 -> 10일 -> 인덱스 9
const r4 = simulateSymbol({
  symbolKey: "arc",
  level: 10,
  progress: 1000,
  daily: 10,
  weekly: 0,
  startDate: start,
  includeToday: true,
});
assert.equal(r4.days, 9);
assert.equal(r4.remainingMeso, 990000000);

// 주간 보너스: 2026-11-26은 목요일 -> 3일째에 +100
const r5 = simulateSymbol({
  symbolKey: "cer",
  level: 10,
  progress: 1000,
  daily: 0,
  weekly: 100,
  startDate: start,
  includeToday: true,
});
assert.equal(toDateStr(r5.maxDate), "2026-11-26");

console.log("모든 테스트 통과");
