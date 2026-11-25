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
  normalizeExtraSteps,
  extraOn,
  normalizeOffDays,
  countOffDays,
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

// 5) 추가 수량: 시작일부터 매일, 더 늦은 시작일이 오면 더해지지 않고 값이 바뀐다
const steps = normalizeExtraSteps([
  { start: "2026-12-01", amount: 9 },
  { start: "2026-11-25", amount: 8 }, // 입력 순서가 뒤바뀌어도 시작일 순으로 정렬
]);
assert.equal(extraOn(steps, parseDate("2026-11-24")), 0); // 시작 전
assert.equal(extraOn(steps, parseDate("2026-11-25")), 8);
assert.equal(extraOn(steps, parseDate("2026-11-30")), 8);
assert.equal(extraOn(steps, parseDate("2026-12-01")), 9); // 8+9가 아니라 9
assert.equal(extraOn(steps, parseDate("2027-01-31")), 9);
// 추가량 0으로 끝낼 수 있다
const stopSteps = normalizeExtraSteps([{ start: "2026-11-25", amount: 8 }, { start: "2026-11-27", amount: 0 }]);
assert.equal(extraOn(stopSteps, parseDate("2026-11-26")), 8);
assert.equal(extraOn(stopSteps, parseDate("2026-11-27")), 0);
// 같은 시작일이면 아래에 입력한 항목이 적용
const dup = normalizeExtraSteps([{ start: "2026-11-25", amount: 3 }, { start: "2026-11-25", amount: 7 }]);
assert.equal(extraOn(dup, parseDate("2026-11-25")), 7);
// 잘못된 항목은 무시
assert.equal(normalizeExtraSteps([{ start: "", amount: 5 }, { start: "2026-11-25", amount: -1 }, { start: "2026-11-25", amount: "x" }]).length, 0);

// 시뮬레이션: 레벨 10, 성장치 1000 -> 남은 100. 일일 10, 11/25부터 +8, 12/01부터 +9
// 11/24: 10, 11/25부터 하루 18 -> 11/24(10) + 11/25~11/29(18*5=90) = 100 -> 11/29
const ex1 = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 10, weekly: 0,
  startDate: start, includeToday: true, extra: steps,
});
assert.equal(toDateStr(ex1.maxDate), "2026-11-29");
// 추가량이 없으면 10일째(12/03)
const ex0 = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 10, weekly: 0,
  startDate: start, includeToday: true,
});
assert.equal(toDateStr(ex0.maxDate), "2026-12-03");
// 교체 확인: 일일 0, 11/24부터 +10, 11/26부터 +50 -> 11/24:10, 11/25:10, 11/26:50 (합 70), 11/27:50 (합 120) -> 11/27
const ex2 = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 0, weekly: 0,
  startDate: start, includeToday: true,
  extra: normalizeExtraSteps([{ start: "2026-11-24", amount: 10 }, { start: "2026-11-26", amount: 50 }]),
});
assert.equal(toDateStr(ex2.maxDate), "2026-11-27");
assert.notEqual(ex2.days, Infinity); // 일일 0이어도 추가량만으로 계산 가능

// 목표일 필요량에 추가량 반영: 11/24~12/03 10일, 추가 +10/일 -> 총 100이라 필요 0
assert.equal(
  requiredDaily({ level: 10, progress: 1000, weekly: 0, startDate: start, includeToday: true,
    targetDate: parseDate("2026-12-03"),
    extra: normalizeExtraSteps([{ start: "2026-11-24", amount: 10 }]) }),
  0
);

// 6) 못하는 날에는 추가량도 안 들어온다
const off6 = normalizeOffDays([{ start: "2026-11-25", end: "2026-11-27" }]);
const ex3 = simulateSymbol({
  symbolKey: "cer", level: 10, progress: 1000, daily: 0, weekly: 0,
  startDate: start, includeToday: true, offDays: off6,
  extra: normalizeExtraSteps([{ start: "2026-11-24", amount: 20 }]),
});
// 11/24(20), 11/25~27 쉼, 11/28(40) 11/29(60) 11/30(80) 12/01(100)
assert.equal(toDateStr(ex3.maxDate), "2026-12-01");

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

// 8) UTC 기준 날짜 처리
import { addDays, formatDate, todayUTC } from "./calc.js";
const d0 = parseDate("2026-03-07");
assert.equal(d0.getUTCHours(), 0);
assert.equal(toDateStr(addDays(d0, 2)), "2026-03-09"); // 서머타임 구간에도 정확히 +2일
assert.equal(addDays(d0, 2).getTime() - d0.getTime(), 2 * 86400000);
assert.equal(formatDate(parseDate("2026-11-26")), "2026.11.26 (목)");
const t0 = todayUTC();
assert.equal(t0.getTime() % 86400000, 0);
console.log("UTC 테스트 통과");
