import React, { useEffect, useMemo, useState } from "react";
import {
  SYMBOLS,
  CLASS_TYPES,
  MAX_LEVEL,
  NEED_GROWTH,
  NEED_MESO,
  CUM_GROWTH,
  CUM_MESO,
  STAT_AT,
  autAt,
  GRAND_BONUS_AT,
  TOTAL_GROWTH,
} from "./data.js";
import { LevelChart, CompareChart } from "./Charts.jsx";
import {
  simulateSymbol,
  requiredDaily,
  formatDate,
  formatMeso,
  parseDate,
  toDateStr,
  addDays,
} from "./calc.js";

const STORAGE_KEY = "authentic-force-calc:v1";

const newId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_RATES = {
  cer: { daily: 10, weekly: 0 },
  arc: { daily: 10, weekly: 0 },
  odi: { daily: 10, weekly: 0 },
  dow: { daily: 10, weekly: 0 },
  art: { daily: 10, weekly: 0 },
  car: { daily: 10, weekly: 0 },
  tal: { daily: 10, weekly: 0 },
  gea: { daily: 10, weekly: 0 },
};

const makeChar = (name = "새 캐릭터", rates = DEFAULT_RATES) => ({
  id: newId(),
  name,
  cls: "normal",
  target: "",
  symbols: {
    cer: { on: true, level: 1, progress: 0, ...rates.cer },
    arc: { on: false, level: 1, progress: 0, ...rates.arc },
    odi: { on: false, level: 1, progress: 0, ...rates.odi },
    dow: { on: false, level: 1, progress: 0, ...rates.dow },
    art: { on: false, level: 1, progress: 0, ...rates.art },
    car: { on: false, level: 1, progress: 0, ...rates.car },
    tal: { on: false, level: 1, progress: 0, ...rates.tal },
    gea: { on: false, level: 1, progress: 0, ...rates.gea },
  },
});

const defaultState = () => ({
  startDate: toDateStr(new Date()),
  includeToday: true,
  rates: DEFAULT_RATES,
  chars: [makeChar("캐릭터 1")],
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.chars && parsed.rates) {
        // 이전 버전 데이터: 캐릭터별 수급량이 없으면 공통 기본값으로 채운다
        for (const sym of SYMBOLS) {
          if (!parsed.rates[sym.key]) parsed.rates[sym.key] = { ...DEFAULT_RATES[sym.key] };
        }
        for (const c of parsed.chars) {
          for (const sym of SYMBOLS) {
            if (!c.symbols[sym.key]) {
              c.symbols[sym.key] = { on: false, level: 1, progress: 0 };
            }
            const cfg = c.symbols[sym.key];
            if (cfg.daily === undefined) cfg.daily = parsed.rates[sym.key].daily;
            if (cfg.weekly === undefined) cfg.weekly = parsed.rates[sym.key].weekly;
          }
        }
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return defaultState();
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function dDay(startDate, date) {
  if (!date) return "";
  const ms = date.getTime() - parseDate(toDateStr(startDate)).getTime();
  return `D+${Math.round(ms / 86400000)}`;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const startDate = useMemo(() => parseDate(state.startDate), [state.startDate]);

  const results = useMemo(() => {
    return state.chars.map((c) => {
      const perSymbol = {};
      let latest = null;
      let impossible = false;
      let totalMeso = 0;
      let allMax = true;
      let anyOn = false;

      for (const s of SYMBOLS) {
        const cfg = c.symbols[s.key];
        const sim = simulateSymbol({
          symbolKey: s.key,
          level: cfg.level,
          progress: num(cfg.progress),
          daily: num(cfg.daily),
          weekly: num(cfg.weekly),
          startDate,
          includeToday: state.includeToday,
        });
        perSymbol[s.key] = sim;
        if (!cfg.on) continue;
        anyOn = true;
        totalMeso += sim.remainingMeso;
        if (!sim.isMax) {
          allMax = false;
          if (sim.days === Infinity) impossible = true;
          else if (!latest || sim.maxDate > latest) latest = sim.maxDate;
        }
      }

      // 현재 AUT / 스탯
      let aut = 0;
      let stat = 0;
      for (const s of SYMBOLS) {
        const cfg = c.symbols[s.key];
        if (!cfg.on) continue;
        aut += autAt(cfg.level);
        if (!s.grand) stat += STAT_AT[c.cls][cfg.level - 1];
      }

      return { perSymbol, latest, impossible, totalMeso, allMax: anyOn && allMax, anyOn, aut, stat };
    });
  }, [state, startDate]);

  const updateChar = (id, patch) =>
    setState((s) => ({
      ...s,
      chars: s.chars.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const updateSymbol = (id, key, patch) =>
    setState((s) => ({
      ...s,
      chars: s.chars.map((c) =>
        c.id === id
          ? { ...c, symbols: { ...c.symbols, [key]: { ...c.symbols[key], ...patch } } }
          : c
      ),
    }));

  const addChar = () =>
    setState((s) => ({
      ...s,
      chars: [...s.chars, makeChar(`캐릭터 ${s.chars.length + 1}`, s.rates)],
    }));

  const copyChar = (id) =>
    setState((s) => {
      const src = s.chars.find((c) => c.id === id);
      if (!src) return s;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = newId();
      copy.name = `${src.name} 복사`;
      return { ...s, chars: [...s.chars, copy] };
    });

  const removeChar = (id) =>
    setState((s) => ({ ...s, chars: s.chars.filter((c) => c.id !== id) }));

  const setRate = (key, field, value) =>
    setState((s) => ({
      ...s,
      rates: { ...s.rates, [key]: { ...s.rates[key], [field]: value } },
    }));

  const resetAll = () => {
    if (confirm("모든 캐릭터와 설정을 초기화할까요?")) setState(defaultState());
  };

  const grandMeso = results.reduce((a, r) => a + r.totalMeso, 0);

  return (
    <div className="app">
      <header className="top">
        <h1>어센틱 포스 MAX 계산기</h1>
        <p className="sub">캐릭터별로 세르니움, 아르크스, 오디움 심볼을 언제 MAX(11레벨)까지 올릴 수 있는지 계산합니다.</p>
      </header>

      <section className="card">
        <h2>공통 설정</h2>
        <div className="settings">
          <label className="field">
            <span>시작일</span>
            <input
              type="date"
              value={state.startDate}
              onChange={(e) => e.target.value && setState((s) => ({ ...s, startDate: e.target.value }))}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={state.includeToday}
              onChange={(e) => setState((s) => ({ ...s, includeToday: e.target.checked }))}
            />
            시작일 당일 일일퀘스트 포함
          </label>
        </div>

        <table className="rates">
          <thead>
            <tr>
              <th>심볼</th>
              <th>새 캐릭터 기본 일일 성장치</th>
              <th>새 캐릭터 기본 주간 성장치 (목요일)</th>
              <th>MAX까지 총 성장치</th>
            </tr>
          </thead>
          <tbody>
            {SYMBOLS.map((s) => (
              <tr key={s.key}>
                <td>
                  <span className="dot" style={{ background: s.color }} />
                  {s.name}
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={state.rates[s.key].daily}
                    onChange={(e) => setRate(s.key, "daily", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={state.rates[s.key].weekly}
                    onChange={(e) => setRate(s.key, "weekly", e.target.value)}
                  />
                </td>
                <td>{TOTAL_GROWTH.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          여기 값은 새 캐릭터를 추가할 때 들어가는 기본값입니다. 이미 만든 캐릭터의 수급량은 각 캐릭터 카드에서
          심볼별로 따로 수정하세요.
        </p>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>캐릭터 요약</h2>
          <span className="muted">전체 남은 메소 {formatMeso(grandMeso)}</span>
        </div>
        <div className="scroll">
          <table className="summary">
            <thead>
              <tr>
                <th>캐릭터</th>
                {SYMBOLS.map((s) => (
                  <th key={s.key}>{s.name}</th>
                ))}
                <th>전부 MAX</th>
                <th>남은 메소</th>
              </tr>
            </thead>
            <tbody>
              {state.chars.map((c, i) => {
                const r = results[i];
                return (
                  <tr key={c.id}>
                    <td className="name">{c.name || "(이름 없음)"}</td>
                    {SYMBOLS.map((s) => {
                      const cfg = c.symbols[s.key];
                      const sim = r.perSymbol[s.key];
                      return (
                        <td key={s.key}>
                          {!cfg.on ? (
                            <span className="muted">-</span>
                          ) : sim.isMax ? (
                            <span className="badge max">MAX</span>
                          ) : sim.days === Infinity ? (
                            <span className="muted">계산 불가</span>
                          ) : (
                            formatDate(sim.maxDate)
                          )}
                        </td>
                      );
                    })}
                    <td className="strong">
                      {!r.anyOn
                        ? "-"
                        : r.allMax
                        ? "완료"
                        : r.impossible
                        ? "계산 불가"
                        : `${formatDate(r.latest)} ${dDay(startDate, r.latest)}`}
                    </td>
                    <td>{formatMeso(r.totalMeso)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="sub-title">전부 MAX까지 걸리는 기간</h3>
        <CompareChart
          rows={state.chars.map((c, i) => {
            const r = results[i];
            return {
              id: c.id,
              name: c.name,
              done: r.allMax,
              days: r.allMax ? 0 : r.latest && r.anyOn ? Math.round((r.latest - startDate) / 86400000) : null,
              date: r.latest,
            };
          })}
        />
      </section>

      {state.chars.map((c, i) => (
        <CharCard
          key={c.id}
          c={c}
          r={results[i]}
          startDate={startDate}
          includeToday={state.includeToday}
          onChange={(patch) => updateChar(c.id, patch)}
          onSymbol={(key, patch) => updateSymbol(c.id, key, patch)}
          onCopy={() => copyChar(c.id)}
          onRemove={() => removeChar(c.id)}
          canRemove={state.chars.length > 1}
        />
      ))}

      <div className="actions">
        <button className="primary" onClick={addChar}>
          + 캐릭터 추가
        </button>
        <button onClick={() => setShowTable((v) => !v)}>
          {showTable ? "기준 테이블 닫기" : "기준 테이블 보기"}
        </button>
        <button className="danger" onClick={resetAll}>
          전체 초기화
        </button>
      </div>

      {showTable && <RefTable />}
    </div>
  );
}

function CharCard({ c, r, startDate, includeToday, onChange, onSymbol, onCopy, onRemove, canRemove }) {
  const [open, setOpen] = useState(false);
  const cls = CLASS_TYPES.find((t) => t.key === c.cls);
  const target = c.target ? parseDate(c.target) : null;
  const chartSeries = SYMBOLS.filter((s) => c.symbols[s.key].on).map((s) => ({
    key: s.key,
    name: s.name,
    color: s.color,
    startLevel: c.symbols[s.key].level,
    levelUps: r.perSymbol[s.key].levelUps,
    isMax: r.perSymbol[s.key].isMax,
  }));

  return (
    <section className="card">
      <div className="char-head">
        <input
          className="name-input"
          value={c.name}
          placeholder="캐릭터 이름"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <select value={c.cls} onChange={(e) => onChange({ cls: e.target.value })}>
          {CLASS_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button onClick={() => setOpen((v) => !v)}>{open ? "상세 닫기" : "레벨업 일정"}</button>
        <button onClick={onCopy}>복사</button>
        {canRemove && (
          <button className="danger" onClick={onRemove}>
            삭제
          </button>
        )}
      </div>

      <div className="chips">
        <span className="chip">현재 AUT {r.aut}</span>
        <span className="chip">
          현재 {cls.statLabel} +{r.stat.toLocaleString()}
        </span>
        <span className="chip">남은 메소 {formatMeso(r.totalMeso)}</span>
        <span className="chip strong">
          {!r.anyOn
            ? "진행 중인 심볼 없음"
            : r.allMax
            ? "전부 MAX 완료"
            : r.impossible
            ? "수급량을 입력하세요"
            : `전부 MAX ${formatDate(r.latest)} (${dDay(startDate, r.latest)})`}
        </span>
      </div>

      <div className="target-row">
        <label className="field">
          <span>목표 날짜 (선택)</span>
          <input
            type="date"
            value={c.target || ""}
            onChange={(e) => onChange({ target: e.target.value })}
          />
        </label>
        {c.target && (
          <button onClick={() => onChange({ target: "" })}>목표 지우기</button>
        )}
        <span className="muted target-hint">
          목표 날짜를 정하면 심볼마다 그날까지 하루에 얼마를 올려야 하는지 보여줘요.
        </span>
      </div>

      <div className="symbols">
        {SYMBOLS.map((s) => {
          const cfg = c.symbols[s.key];
          const sim = r.perSymbol[s.key];
          const need = cfg.level < MAX_LEVEL ? NEED_GROWTH[cfg.level - 1] : 0;
          return (
            <div key={s.key} className={`symbol ${cfg.on ? "" : "off"}`} style={{ "--accent": s.color }}>
              <label className="check head">
                <input
                  type="checkbox"
                  checked={cfg.on}
                  onChange={(e) => onSymbol(s.key, { on: e.target.checked })}
                />
                <span className="dot" style={{ background: s.color }} />
                {s.name}
                {s.grand && <span className="tag">그랜드</span>}
              </label>

              {s.grand && cfg.on && (
                <div className="bonus">
                  {(() => {
                    const b = GRAND_BONUS_AT(cfg.level);
                    return `경험치 +${b.exp}% / 메소 +${b.meso}% / 드롭 +${b.drop}%`;
                  })()}
                </div>
              )}

              <div className="inputs">
                <label className="field">
                  <span>현재 레벨</span>
                  <select
                    value={cfg.level}
                    disabled={!cfg.on}
                    onChange={(e) => {
                      const level = Number(e.target.value);
                      onSymbol(s.key, { level, progress: 0 });
                    }}
                  >
                    {Array.from({ length: MAX_LEVEL }, (_, k) => k + 1).map((lv) => (
                      <option key={lv} value={lv}>
                        {lv === MAX_LEVEL ? "11 (MAX)" : lv}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>
                    현재 성장치{need ? ` / ${need}` : ""}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={need ? need - 1 : 0}
                    disabled={!cfg.on || cfg.level >= MAX_LEVEL}
                    value={cfg.progress}
                    onChange={(e) => onSymbol(s.key, { progress: e.target.value })}
                  />
                </label>
              </div>

              <div className="inputs rate-inputs">
                <label className="field">
                  <span>일일 성장치</span>
                  <input
                    type="number"
                    min="0"
                    disabled={!cfg.on}
                    value={cfg.daily}
                    onChange={(e) => onSymbol(s.key, { daily: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>주간 추가 (목)</span>
                  <input
                    type="number"
                    min="0"
                    disabled={!cfg.on}
                    value={cfg.weekly}
                    onChange={(e) => onSymbol(s.key, { weekly: e.target.value })}
                  />
                </label>
              </div>

              {cfg.on && (
                <div className="result">
                  {sim.isMax ? (
                    <div className="big">MAX 완료</div>
                  ) : sim.days === Infinity ? (
                    <div className="big muted">수급량 입력 필요</div>
                  ) : (
                    <>
                      <div className="big">{formatDate(sim.maxDate)}</div>
                      <div className="muted">
                        {dDay(startDate, sim.maxDate)} ({sim.days.toLocaleString()}일 후)
                      </div>
                    </>
                  )}
                  <div className="kv">
                    <span>남은 성장치</span>
                    <b>{sim.remainingGrowth.toLocaleString()}</b>
                  </div>
                  <div className="kv">
                    <span>남은 메소</span>
                    <b>{formatMeso(sim.remainingMeso)}</b>
                  </div>
                  {target && !sim.isMax && (() => {
                    const need = requiredDaily({
                      level: cfg.level,
                      progress: num(cfg.progress),
                      weekly: num(cfg.weekly),
                      startDate,
                      includeToday,
                      targetDate: target,
                    });
                    const ok = sim.maxDate && sim.maxDate <= target;
                    return (
                      <div className={`target-result ${ok ? "ok" : "no"}`}>
                        {need === Infinity
                          ? "목표일이 시작일보다 앞서요"
                          : `목표일까지 하루 ${need.toLocaleString()} 필요 (현재 ${num(cfg.daily)})`}
                        <br />
                        {ok ? "지금 수급량으로 달성 가능" : "지금 수급량으로는 부족"}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <LevelChart series={chartSeries} startDate={startDate} />

      {open && (
        <div className="scroll">
          <table className="schedule">
            <thead>
              <tr>
                <th>심볼</th>
                <th>레벨업</th>
                <th>가능 날짜</th>
                <th>D+</th>
                <th>필요 메소</th>
              </tr>
            </thead>
            <tbody>
              {SYMBOLS.filter((s) => c.symbols[s.key].on).flatMap((s) =>
                r.perSymbol[s.key].levelUps.map((u) => (
                  <tr key={`${s.key}-${u.level}`}>
                    <td>
                      <span className="dot" style={{ background: s.color }} />
                      {s.name}
                    </td>
                    <td>
                      {u.level - 1} → {u.level}
                    </td>
                    <td>{formatDate(u.date)}</td>
                    <td>{dDay(startDate, u.date)}</td>
                    <td>{formatMeso(u.mesoCost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="hint">레벨업 가능 날짜는 성장치가 모였을 때 기준이며, 메소는 별도로 준비해야 합니다.</p>
        </div>
      )}
    </section>
  );
}

function RefTable() {
  const fmt = (n) => n.toLocaleString();
  return (
    <section className="card">
      <h2>기준 테이블</h2>
      <div className="scroll">
        <table className="ref">
          <thead>
            <tr>
              <th rowSpan="2">레벨</th>
              <th rowSpan="2">AUT</th>
              <th colSpan="3">스탯 증가량</th>
              <th colSpan="3">그랜드 보너스</th>
              <th rowSpan="2">필요 성장치</th>
              <th colSpan={SYMBOLS.length}>필요 메소</th>
              <th rowSpan="2">누적 성장치</th>
              <th colSpan={SYMBOLS.length}>누적 메소</th>
            </tr>
            <tr>
              <th>일반</th>
              <th>제논</th>
              <th>데몬어벤져</th>
              <th>경험치</th>
              <th>메소</th>
              <th>드롭</th>
              {SYMBOLS.map((x) => (
                <th key={`n-${x.key}`}>{x.name}</th>
              ))}
              {SYMBOLS.map((x) => (
                <th key={`c-${x.key}`}>{x.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MAX_LEVEL }, (_, k) => k + 1).map((lv) => {
              const last = lv === MAX_LEVEL;
              return (
                <tr key={lv}>
                  <td>{lv}</td>
                  <td>{autAt(lv)}</td>
                  <td>{fmt(STAT_AT.normal[lv - 1])}</td>
                  <td>{fmt(STAT_AT.xenon[lv - 1])}</td>
                  <td>{fmt(STAT_AT.da[lv - 1])}</td>
                  <td>{GRAND_BONUS_AT(lv).exp}%</td>
                  <td>{GRAND_BONUS_AT(lv).meso}%</td>
                  <td>{GRAND_BONUS_AT(lv).drop}%</td>
                  <td>{last ? "MAX" : fmt(NEED_GROWTH[lv - 1])}</td>
                  {SYMBOLS.map(({ key: k }) => (
                    <td key={k}>{last ? "-" : fmt(NEED_MESO[k][lv - 1])}</td>
                  ))}
                  <td>{fmt(CUM_GROWTH[lv - 1])}</td>
                  {SYMBOLS.map(({ key: k }) => (
                    <td key={k}>{fmt(CUM_MESO[k][lv - 1])}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
