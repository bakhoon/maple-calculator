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

// 4) 목표일까지 필요한 일일 성장치: 레벨 10, 성장치 1000 -> 남은 100, 10일(11/24~12/03) 이면 10
import {
  requiredDaily,
  normalizeEvents,
  normalizeOffDays,
  countOffDays,
  findEventOverlaps,
  findOffDayOverlaps,
} from "./calc.js";
assert.equal(
  requiredDaily({ level: 10, progress: 1000, weekly: 0, startDate: start, includeToday: true, targetDate: parseDate("2026-12-03") }),
  10
);
assert.equal(
  requiredDaily({ level: 11, progress: 0, weekly: 0, startDate: start, includeToday: true, targetDate: parseDate("2026-12-03") }),
  0
);
// 주간 보너스 반영: 위 기간에 목요일(11/26, 12/03) 2번 x 40 = 80 -> 남은 20 / 10일 = 2
assert.equal(
  requiredDaily({ level: 10, progress: 1000, weekly: 40, startDate: start, includeToday: true, targetDate: parseDate("2026-12-03") }),
  2
);
console.log("목표일 테스트 통과");

// 5) 이벤트: 심볼마다 다른 수량
const ev1 = { start: "2026-11-24", end: "2026-11-28", amounts: { cer: 20, arc: 5 } };
const evCer = normalizeEvents([ev1], "cer");
const evArc = normalizeEvents([ev1], "arc");
assert.equal(evCer[0].amount, 20);
assert.equal(evArc[0].amount, 5);
assert.equal(normalizeEvents([ev1], "odi").length, 0); // 수량이 없는 심볼은 적용 안 됨

// 레벨 10, 성장치 1000 -> 남은 100. 일일 0, 세르니움 +20/일 (11/24~11/28) -> 5일째(11/28)에 MAX
const re = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 0, weekly: 0,
  startDate: start, includeToday: true, events: evCer,
});
assert.equal(toDateStr(re.maxDate), "2026-11-28");
// 같은 이벤트라도 아르크스는 +5/일이라 5일간 25만 모이고 끝나서 MAX 불가
const ra = simulateSymbol({
  symbolKey: "arc", level: 10, progress: 1000, daily: 0, weekly: 0,
  startDate: start, includeToday: true, events: evArc,
});
assert.equal(ra.maxDate, null); // 이벤트가 5일뿐이라 25만 모이고 끝 -> 이벤트 종료 후 수급 0이라 MAX 불가
assert.equal(ra.days, Infinity);

// 일일 10 + 세르니움 이벤트 +10 -> 남은 100이 5일 (11/28)
const re2 = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 10, weekly: 0,
  startDate: start, includeToday: true,
  events: normalizeEvents([{ start: "2026-11-24", end: "2026-12-31", amounts: { cer: 10 } }], "cer"),
});
assert.equal(toDateStr(re2.maxDate), "2026-11-28");

// 목표일 필요량에 이벤트 반영: 10일 동안 이벤트 총 100 -> 필요 0
assert.equal(
  requiredDaily({ level: 10, progress: 1000, weekly: 0, startDate: start, includeToday: true,
    targetDate: parseDate("2026-12-03"),
    events: normalizeEvents([{ start: "2026-11-24", end: "2026-12-03", amounts: { cer: 10 } }], "cer") }),
  0
);

// 6) 이벤트 겹침: 날짜가 겹쳐도 같은 심볼에 둘 다 수량이 없으면 경고 안 함
const ov = findEventOverlaps([
  { name: "1", start: "2026-11-24", end: "2026-11-30", amounts: { cer: 5, arc: 5 } },
  { name: "2", start: "2026-11-28", end: "2026-12-05", amounts: { cer: 5 } },
  { name: "3", start: "2026-12-01", end: "2026-12-10", amounts: { arc: 5 } },
  { name: "4", start: "2026-11-25", end: "2026-11-26", amounts: { odi: 5 } },
]);
// 1-2: 날짜 11/28~11/30, 공통 심볼 cer -> 경고 / 1-3 날짜 안 겹침 / 2-3: 12/01~12/05 날짜는 겹치나 심볼이 달라 제외 / 1-4 심볼 다름
assert.equal(ov.length, 1);
assert.equal(toDateStr(ov[0].from), "2026-11-28");
assert.equal(toDateStr(ov[0].to), "2026-11-30");
assert.deepEqual(ov[0].symbols, ["cer"]);

// 7) 못하는 날짜
// 레벨 10, 성장치 1000 -> 남은 100, 일일 10. 11/25~11/27 못하면 5일치가 아니라 10일에서 3일 밀림
const off = normalizeOffDays([{ start: "2026-11-25", end: "2026-11-27" }]);
const ro = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 10, weekly: 0,
  startDate: start, includeToday: true, offDays: off,
});
// 정상이면 11/24~12/03(10일). 못하는 3일 때문에 12/06
assert.equal(toDateStr(ro.maxDate), "2026-12-06");
// 끝일이 비어 있으면 하루짜리
assert.equal(countOffDays([{ start: "2026-11-25" }]), 1);
assert.equal(countOffDays([{ start: "2026-11-25", end: "2026-11-27" }, { start: "2026-11-27", end: "2026-11-28" }]), 4);
// 못하는 날에는 이벤트 수량도 안 들어옴: 이벤트 +20(11/24~11/28), 11/25~11/27 못함 -> 11/24, 11/28 두 번뿐
const roe = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 0, weekly: 0,
  startDate: start, includeToday: true, offDays: off, events: evCer,
});
assert.equal(roe.maxDate, null);
// 목표일 필요량: 10일 중 3일 못하면 7일로 나눈다. 남은 100 -> ceil(100/7)=15
assert.equal(
  requiredDaily({ level: 10, progress: 1000, weekly: 0, startDate: start, includeToday: true,
    targetDate: parseDate("2026-12-03"), offDays: off }),
  15
);
// 못하는 날짜끼리 겹침
const oo = findOffDayOverlaps([
  { start: "2026-11-25", end: "2026-11-27" },
  { start: "2026-11-27" },
  { start: "2026-12-01", end: "2026-12-02" },
]);
assert.equal(oo.length, 1);
assert.equal(toDateStr(oo[0].from), "2026-11-27");

console.log("이벤트, 못하는 날짜 테스트 통과");
