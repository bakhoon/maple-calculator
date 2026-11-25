import {
  MAX_LEVEL,
  CUM_GROWTH,
  CUM_MESO,
  TOTAL_GROWTH,
  NEED_GROWTH,
} from "./data.js";

// 모든 날짜는 UTC 기준(자정 0시)으로 다룬다. 사용자의 로컬 시간대는 쓰지 않는다.
const WEEKLY_RESET_DAY = 4; // 목요일 (0=일 ... 4=목, UTC 기준)
const MAX_DAYS = 20000;

/** 지금 UTC 기준 오늘 날짜 (UTC 자정) */
export function todayUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function addDays(date, n) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + n));
}

export function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDateStr(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
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
/**
 * 이벤트: { name, start: "YYYY-MM-DD", end: "YYYY-MM-DD", amounts: { 심볼key: 하루 추가 수량 } }
 * 해당 심볼에 적용되는 유효한 이벤트만 날짜로 변환해 돌려준다.
 */
export function normalizeEvents(events, symbolKey) {
  const out = [];
  for (const e of events || []) {
    if (!e.start || !e.end) continue;
    const amount = Number(e.amounts && e.amounts[symbolKey]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const start = parseDate(e.start);
    const end = parseDate(e.end);
    if (end < start) continue;
    out.push({ start, end, amount });
  }
  return out;
}

export function eventBonusOn(events, date) {
  let total = 0;
  for (const e of events) {
    if (date >= e.start && date <= e.end) total += e.amount;
  }
  return total;
}

/**
 * 못하는 날짜 범위 목록: { start, end?, note? }. end가 비어 있으면 하루짜리로 본다.
 */
export function normalizeOffDays(offDays) {
  const out = [];
  for (const o of offDays || []) {
    if (!o.start) continue;
    const start = parseDate(o.start);
    const end = o.end ? parseDate(o.end) : start;
    if (end < start) continue;
    out.push({ start, end });
  }
  return out;
}

export function isOffDay(offDays, date) {
  return offDays.some((o) => date >= o.start && date <= o.end);
}

/** 못하는 날짜가 합쳐서 며칠인지 (겹치는 날은 한 번만 센다) */
export function countOffDays(offDays) {
  const seen = new Set();
  for (const o of normalizeOffDays(offDays)) {
    for (let d = o.start; d <= o.end; d = addDays(d, 1)) seen.add(d.getTime());
  }
  return seen.size;
}

/**
 * 날짜가 겹치고 같은 심볼에 둘 다 수량이 들어가는 이벤트 쌍을 찾는다.
 * 반환: [{ a, b, from: Date, to: Date, symbols: [심볼key] }]
 */
export function findEventOverlaps(events) {
  const valid = (events || []).filter((e) => e.start && e.end && parseDate(e.end) >= parseDate(e.start));
  const has = (e, k) => Number(e.amounts && e.amounts[k]) > 0;
  const out = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i];
      const b = valid[j];
      const keys = Object.keys({ ...(a.amounts || {}), ...(b.amounts || {}) });
      const symbols = keys.filter((k) => has(a, k) && has(b, k));
      if (symbols.length === 0) continue;
      const from = new Date(Math.max(parseDate(a.start).getTime(), parseDate(b.start).getTime()));
      const to = new Date(Math.min(parseDate(a.end).getTime(), parseDate(b.end).getTime()));
      if (from <= to) out.push({ a, b, from, to, symbols });
    }
  }
  return out;
}

/** 못하는 날짜끼리 날짜가 겹치는 쌍 */
export function findOffDayOverlaps(offDays) {
  const valid = (offDays || []).filter((o) => o.start && (!o.end || parseDate(o.end) >= parseDate(o.start)));
  const out = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i];
      const b = valid[j];
      const aEnd = parseDate(a.end || a.start);
      const bEnd = parseDate(b.end || b.start);
      const from = new Date(Math.max(parseDate(a.start).getTime(), parseDate(b.start).getTime()));
      const to = new Date(Math.min(aEnd.getTime(), bEnd.getTime()));
      if (from <= to) out.push({ a, b, from, to });
    }
  }
  return out;
}

export function simulateSymbol({
  symbolKey,
  level,
  progress,
  daily,
  weekly,
  startDate,
  includeToday,
  events = [],
  offDays = [],
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

  if (daily <= 0 && weekly <= 0 && events.length === 0) {
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
    if (!isOffDay(offDays, date)) total += daily + eventBonusOn(events, date);
    if (date.getUTCDay() === WEEKLY_RESET_DAY) total += weekly;

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
  return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(
    date.getUTCDate()
  ).padStart(2, "0")} (${days[date.getUTCDay()]})`;
}

/**
 * 목표 날짜까지 MAX를 만들기 위해 하루에 필요한 성장치.
 * 시작일(includeToday에 따라 당일 제외)부터 목표일까지 매일 얻는다고 가정하고,
 * 그 사이 목요일마다 들어오는 주간 보너스는 미리 빼서 계산한다.
 */
export function requiredDaily({
  level,
  progress,
  weekly,
  startDate,
  includeToday,
  targetDate,
  events = [],
  offDays = [],
}) {
  const lvl = Math.min(Math.max(level, 1), MAX_LEVEL);
  if (lvl >= MAX_LEVEL) return 0;
  const cap = NEED_GROWTH[lvl - 1] - 1;
  const prog = Math.min(Math.max(progress || 0, 0), cap);
  const remaining = TOTAL_GROWTH - (CUM_GROWTH[lvl - 1] + prog);

  let dayCount = 0;
  let thursdays = 0;
  let eventTotal = 0;
  for (let d = new Date(startDate), i = 0; d <= targetDate; i++, d = addDays(startDate, i)) {
    if (i === 0 && !includeToday) continue;
    if (!isOffDay(offDays, d)) {
      dayCount++;
      eventTotal += eventBonusOn(events, d);
    }
    if (d.getUTCDay() === WEEKLY_RESET_DAY) thursdays++;
  }
  if (dayCount <= 0) return Infinity;
  return Math.max(0, Math.ceil((remaining - thursdays * weekly - eventTotal) / dayCount));
}
