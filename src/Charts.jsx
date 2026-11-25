import React from "react";
import { MAX_LEVEL } from "./data.js";
import { addDays, formatDate } from "./calc.js";

const W = 680;
const H = 260;
const PAD = { l: 38, r: 16, t: 14, b: 30 };

const dayDiff = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);
const shortDate = (d) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
const shortYear = (d) => `${String(d.getUTCFullYear()).slice(2)}.${d.getUTCMonth() + 1}`;

/**
 * 심볼별 레벨 성장 그래프 (계단식).
 * series: [{ key, name, color, startLevel, levelUps: [{level, date}], isMax }]
 */
export function LevelChart({ series, startDate, title, subtitle }) {
  const visible = series.filter((s) => !s.isMax && s.levelUps.length > 0);
  if (visible.length === 0) return null;

  const xMax = Math.max(
    1,
    ...visible.map((s) => dayDiff(startDate, s.levelUps[s.levelUps.length - 1].date))
  );
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (d) => PAD.l + (d / xMax) * iw;
  const y = (lv) => PAD.t + ih - ((lv - 1) / (MAX_LEVEL - 1)) * ih;

  const xTicks = Array.from({ length: 6 }, (_, i) => Math.round((xMax * i) / 5));
  const yTicks = [1, 3, 5, 7, 9, 11];

  return (
    <div className="chart-wrap">
      {title && (
        <div className="chart-title">
          <i style={{ background: visible[0].color }} />
          <b>{title}</b>
          {subtitle && <span className="muted">{subtitle}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="심볼 레벨 성장 그래프">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="axis">
              {t}
            </text>
          </g>
        ))}
        {xTicks.map((t) => {
          const d = addDays(startDate, t);
          return (
            <text key={t} x={x(t)} y={H - 10} textAnchor="middle" className="axis">
              {shortDate(d)}
              {t === 0 || t === xMax ? ` '${shortYear(d).split(".")[0]}` : ""}
            </text>
          );
        })}

        {visible.map((s) => {
          let path = `M ${x(0)} ${y(s.startLevel)}`;
          let prev = s.startLevel;
          for (const u of s.levelUps) {
            const dx = dayDiff(startDate, u.date);
            path += ` L ${x(dx)} ${y(prev)} L ${x(dx)} ${y(u.level)}`;
            prev = u.level;
          }
          path += ` L ${x(xMax)} ${y(prev)}`;
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />
              {s.levelUps.map((u) => (
                <circle key={u.level} cx={x(dayDiff(startDate, u.date))} cy={y(u.level)} r="3.2" fill={s.color}>
                  <title>{`${s.name} Lv.${u.level} · ${formatDate(u.date)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      {visible.length > 1 && (
        <div className="legend">
          {visible.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 캐릭터별 전부 MAX까지 걸리는 기간 비교 (가로 막대).
 * rows: [{ id, name, days, date, done }]
 */
export function CompareChart({ rows }) {
  const valid = rows.filter((r) => r.days !== null);
  if (valid.length === 0) return null;
  const maxDays = Math.max(1, ...valid.map((r) => r.days));

  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.id}>
          <span className="bar-name">{r.name || "(이름 없음)"}</span>
          <div className="bar-track">
            {r.days !== null && (
              <div
                className={`bar-fill ${r.done ? "done" : ""}`}
                style={{ width: `${Math.max(2, (r.days / maxDays) * 100)}%` }}
              />
            )}
          </div>
          <span className="bar-label">
            {r.done ? "완료" : r.days === null ? "-" : `${r.days.toLocaleString()}일 · ${shortDate(r.date)}`}
          </span>
        </div>
      ))}
    </div>
  );
}
