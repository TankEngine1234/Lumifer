import type { NASAClimateResult } from '../../types';

interface Props {
  climate: NASAClimateResult;
}

const W = 320;
const TEMP_TOP = 8;
const TEMP_BOT = 56;
const PRECIP_TOP = 68;
const PRECIP_BOT = 110;

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function dateLabel(dateStr: string): string {
  // YYYYMMDD → "Jan 1"
  const y = parseInt(dateStr.slice(0, 4));
  const m = parseInt(dateStr.slice(4, 6)) - 1;
  const d = parseInt(dateStr.slice(6, 8));
  return new Date(y, m, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ClimateChart({ climate }: Props) {
  if (!climate.daily) return null;

  const { T2M_MAX, T2M_MIN, PRECTOTCORR } = climate.daily;
  const dates = Object.keys(T2M_MAX).sort();
  const n = dates.length;
  if (n === 0) return null;

  const tmaxVals = dates.map(d => T2M_MAX[d]);
  const tminVals = dates.map(d => T2M_MIN[d]);
  const precipVals = dates.map(d => PRECTOTCORR[d]);

  const tAll = [...tmaxVals, ...tminVals];
  const tMin = Math.min(...tAll);
  const tMax = Math.max(...tAll);
  const precipMax = Math.max(...precipVals, 5); // min scale 5mm

  const barW = W / n;

  // Build temperature polylines
  const tmaxPts = tmaxVals.map((t, i) => {
    const x = (i / (n - 1)) * W;
    const y = TEMP_TOP + (1 - normalize(t, tMin, tMax)) * (TEMP_BOT - TEMP_TOP);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const tminPts = tminVals.map((t, i) => {
    const x = (i / (n - 1)) * W;
    const y = TEMP_TOP + (1 - normalize(t, tMin, tMax)) * (TEMP_BOT - TEMP_TOP);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Stress highlight rects
  const heatRects: { x: number; w: number }[] = [];
  const droughtRects: { x: number; w: number }[] = [];
  let droughtRunStart = -1;

  dates.forEach((date, i) => {
    const x = i * barW;
    if (T2M_MAX[date] > 34) {
      heatRects.push({ x, w: barW + 0.5 });
    }
    if (PRECTOTCORR[date] < 1.0) {
      if (droughtRunStart === -1) droughtRunStart = i;
    } else {
      if (droughtRunStart !== -1 && i - droughtRunStart >= 7) {
        droughtRects.push({ x: droughtRunStart * barW, w: (i - droughtRunStart) * barW });
      }
      droughtRunStart = -1;
    }
  });
  if (droughtRunStart !== -1 && dates.length - droughtRunStart >= 7) {
    droughtRects.push({ x: droughtRunStart * barW, w: (dates.length - droughtRunStart) * barW });
  }

  // 34°C threshold line Y position
  const thresholdY = TEMP_TOP + (1 - normalize(34, tMin, tMax)) * (TEMP_BOT - TEMP_TOP);

  // Tick labels: start, mid, end
  const tickIdxs = [0, Math.floor(n / 2), n - 1];

  return (
    <div className="glass px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-bold tracking-widest text-white/35 uppercase">
          90-Day Climate · Brazos County TX
        </p>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-white/60 inline-block rounded" />
            <span className="text-[8px] text-white/40">Temp</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 bg-cyan-400/70 inline-block rounded" />
            <span className="text-[8px] text-white/40">Rain</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} 122`} className="w-full h-auto">
        {/* ── Temperature panel ── */}

        {/* Drought highlight bands (behind everything) */}
        {droughtRects.map((r, i) => (
          <rect key={`dr-${i}`} x={r.x} y={TEMP_TOP} width={r.w} height={TEMP_BOT - TEMP_TOP}
            fill="rgba(234,179,8,0.10)" />
        ))}

        {/* Heat highlight bands */}
        {heatRects.map((r, i) => (
          <rect key={`hr-${i}`} x={r.x} y={TEMP_TOP} width={r.w} height={TEMP_BOT - TEMP_TOP}
            fill="rgba(239,68,68,0.16)" />
        ))}

        {/* 34°C threshold dashed line */}
        {tMax > 30 && (
          <line x1="0" y1={thresholdY.toFixed(1)} x2={W} y2={thresholdY.toFixed(1)}
            stroke="rgba(239,68,68,0.4)" strokeWidth="0.8" strokeDasharray="3,3" />
        )}

        {/* Tmin line */}
        <polyline points={tminPts} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.8" />

        {/* Tmax line */}
        <polyline points={tmaxPts} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" strokeLinejoin="round" />

        {/* Panel label */}
        <text x="3" y={TEMP_TOP + 5} fontSize="6" fill="rgba(255,255,255,0.35)" fontFamily="system-ui">
          TEMP (°C)
        </text>
        <text x={W - 3} y={TEMP_TOP + 5} fontSize="6" fill="rgba(239,68,68,0.6)" fontFamily="system-ui" textAnchor="end">
          34°C threshold
        </text>

        {/* ── Separator ── */}
        <line x1="0" y1="63" x2={W} y2="63" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

        {/* ── Precipitation panel ── */}
        {precipVals.map((p, i) => {
          const x = i * barW;
          const h = normalize(p, 0, precipMax) * (PRECIP_BOT - PRECIP_TOP);
          const y = PRECIP_BOT - h;
          const isRain = p >= 1.0;
          return (
            <rect key={`p-${i}`}
              x={x} y={y} width={Math.max(barW - 0.3, 0.5)} height={Math.max(h, 0.5)}
              fill={isRain ? 'rgba(6,182,212,0.75)' : 'rgba(255,255,255,0.06)'}
            />
          );
        })}

        <text x="3" y={PRECIP_TOP + 5} fontSize="6" fill="rgba(255,255,255,0.35)" fontFamily="system-ui">
          PRECIP (mm)
        </text>

        {/* ── X-axis tick labels ── */}
        {tickIdxs.map(idx => {
          const x = (idx / (n - 1)) * W;
          const anchor = idx === 0 ? 'start' : idx === n - 1 ? 'end' : 'middle';
          return (
            <text key={`tick-${idx}`} x={x} y={118} fontSize="6.5"
              fill="rgba(255,255,255,0.30)" fontFamily="system-ui" textAnchor={anchor}>
              {dateLabel(dates[idx])}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
