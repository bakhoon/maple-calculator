import {
  MAX_LEVEL,
  CUM_GROWTH,
  CUM_MESO,
  TOTAL_GROWTH,
  NEED_GROWTH,
} from "./data.js";

const WEEKLY_RESET_DAY = 4; // 목요일 (0=일 ... 4=목)
const MAX_DAYS = 20000;

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 심볼 하나가 MAX가 되는 시점을 하루 단위로 시뮬레이션한다.
 * - 매일 daily 만큼 성장치가 쌓인다.
 * - 매주 목요일에 weekly 만큼 추가로 쌓인다.
 * - includeToday가 false면 시작일 당일은 건너뛰고 다음날부터 쌓는다.
 *
 * 반환: { isMax, days, maxDate, remainingGrowth, remainingMeso, levelUps }
 *  levelUps: 레벨업이 가능해지는 날짜 목록 [{ level, date, mesoCost }]
 */
export function simulateSymbol({
  symbolKey,
  level,
  progress,
  daily,
  weekly,
  startDate,
  includeToday,
}) {
  const lvl = Math.min(Math.max(level, 1), MAX_LEVEL);
  const remainingMeso = CUM_MESO[symbolKey][MAX_LEVEL - 1] - CUM_MESO[symbolKey][lvl - 1];

  if (lvl >= MAX_LEVEL) {
    return {
      isMax: true,
      days: 0,
      maxDate: null,
      remainingGrowth: 0,
      remainingMeso: 0,
      levelUps: [],
    };
  }

  const cap = NEED_GROWTH[lvl - 1] - 1;
  const prog = Math.min(Math.max(progress || 0, 0), cap);
  let total = CUM_GROWTH[lvl - 1] + prog;
  const remainingGrowth = TOTAL_GROWTH - total;

  const levelUps = [];
  let nextLevel = lvl + 1;
  let maxDate = null;
  let days = 0;

  if (daily <= 0 && weekly <= 0) {
    return {
      isMax: false,
      days: Infinity,
      maxDate: null,
      remainingGrowth,
      remainingMeso,
      levelUps,
    };
  }

  for (let i = 0; i < MAX_DAYS; i++) {
    const date = addDays(startDate, i);
    if (i === 0 && !includeToday) continue;
    total += daily;
    if (date.getDay() === WEEKLY_RESET_DAY) total += weekly;

    while (nextLevel <= MAX_LEVEL && total >= CUM_GROWTH[nextLevel - 1]) {
      levelUps.push({
        level: nextLevel,
        date,
        mesoCost: CUM_MESO[symbolKey][nextLevel - 1] - CUM_MESO[symbolKey][nextLevel - 2],
      });
      nextLevel++;
    }
    if (total >= TOTAL_GROWTH) {
      maxDate = date;
      days = i;
      break;
    }
  }

  return {
    isMax: false,
    days: maxDate ? days : Infinity,
    maxDate,
    remainingGrowth,
    remainingMeso,
    levelUps,
  };
}

export function formatMeso(n) {
  if (!n) return "0";
  if (n >= 1e8) {
    const eok = n / 1e8;
    return `${eok.toFixed(eok >= 100 ? 0 : 2).replace(/\.?0+$/, "")}억`;
  }
  return `${Math.round(n / 1e4).toLocaleString()}만`;
}

export function formatDate(date) {
  if (!date) return "-";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} (${days[date.getDay()]})`;
}

/**
 * 목표 날짜까지 MAX를 만들기 위해 하루에 필요한 성장치.
 * 시작일(includeToday에 따라 당일 제외)부터 목표일까지 매일 얻는다고 가정하고,
 * 그 사이 목요일마다 들어오는 주간 보너스는 미리 빼서 계산한다.
 */
export function requiredDaily({ level, progress, weekly, startDate, includeToday, targetDate }) {
  const lvl = Math.min(Math.max(level, 1), MAX_LEVEL);
  if (lvl >= MAX_LEVEL) return 0;
  const cap = NEED_GROWTH[lvl - 1] - 1;
  const prog = Math.min(Math.max(progress || 0, 0), cap);
  const remaining = TOTAL_GROWTH - (CUM_GROWTH[lvl - 1] + prog);

  let dayCount = 0;
  let thursdays = 0;
  for (let d = new Date(startDate), i = 0; d <= targetDate; i++, d = addDays(startDate, i)) {
    if (i === 0 && !includeToday) continue;
    dayCount++;
    if (d.getDay() === WEEKLY_RESET_DAY) thursdays++;
  }
  if (dayCount <= 0) return Infinity;
  return Math.max(0, Math.ceil((remaining - thursdays * weekly) / dayCount));
}
