import { useState, useEffect, useRef } from 'react';

export interface LineGraphSeries {
  label: string;
  values: number[];
  color: string;
  dotColor?: string;
  strokeWidth?: number;
  /** fill area under line with this color at low opacity */
  areaColor?: string;
}

export interface LineGraphMetric {
  label: string;
  value: string | number;
  color: string; // tailwind border color class
  accent?: string; // hex accent for the number
}

export interface LineGraphPeriod {
  label: string;
  color: string; // tailwind bg color class
}

export interface LineGraphData {
  dates: string[];
  series: LineGraphSeries[];
  metrics: LineGraphMetric[];
}

interface LineGraphStatisticsProps {
  title: string;
  subtitle?: string;
  periods: LineGraphPeriod[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  data: LineGraphData;
  barSeries?: {
    values: number[];
    rainColor: string;
    dryColor: string;
    rainThreshold: number;
    label: string;
  };
  thresholdLine?: {
    value: number;
    label: string;
    color: string;
  };
  highlightBands?: {
    startIdx: number;
    endIdx: number;
    color: string;
  }[];
  /** Y-axis unit label e.g. "°C" */
  yUnit?: string;
  className?: string;
}

function normalize(val: number, min: number, max: number) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

const VW = 800;
const PAD_L = 48; // room for y-axis labels
const PAD_R = 16;
const CHART_TOP = 28;
const CHART_BOT = 230;
const SEP_Y = CHART_BOT + 18;
const BAR_TOP = SEP_Y + 16;
const BAR_BOT = 340;
const XAXIS_Y = BAR_BOT + 16;
const TOTAL_H = XAXIS_Y + 10;

function smoothPath(
  values: number[],
  maxV: number,
  minV: number,
  top: number,
  bot: number,
  area = false,
): string {
  const w = VW - PAD_L - PAD_R;
  const h = bot - top;
  const pts = values.map((v, i) => ({
    x: PAD_L + (i / (values.length - 1)) * w,
    y: top + (1 - normalize(v, minV, maxV)) * h,
  }));
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i], n = pts[i + 1];
    const cp1x = p.x + (c.x - p.x) * 0.55;
    const cp2x = c.x - (n ? (n.x - c.x) * 0.25 : 0);
    d += ` C${cp1x},${p.y} ${cp2x},${c.y} ${c.x},${c.y}`;
  }
  if (area) d += ` L${pts[pts.length - 1].x},${bot} L${PAD_L},${bot} Z`;
  return d;
}

export default function LineGraphStatistics({
  title,
  subtitle,
  periods,
  selectedPeriod,
  onPeriodChange,
  data,
  barSeries,
  thresholdLine,
  highlightBands,
  yUnit = '',
  className = '',
}: LineGraphStatisticsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setVisible(false);
    setAnimPhase(0);
    const ts = [
      setTimeout(() => setAnimPhase(1), 60),
      setTimeout(() => setAnimPhase(2), 250),
      setTimeout(() => setAnimPhase(3), 550),
      setTimeout(() => setVisible(true), 800),
    ];
    return () => ts.forEach(clearTimeout);
  }, [selectedPeriod]);

  const allV = data.series.flatMap(s => s.values);
  const rawMax = Math.max(...allV);
  const rawMin = Math.min(...allV);
  // Nice round bounds
  const maxV = Math.ceil(rawMax / 5) * 5 + 2;
  const minV = Math.floor(rawMin / 5) * 5 - 2;

  const n = data.dates.length;
  const cw = VW - PAD_L - PAD_R;
  const tickIdxs = n >= 3 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];

  // Y-axis grid lines at nice intervals
  const range = maxV - minV;
  const step = range <= 20 ? 5 : range <= 40 ? 10 : 15;
  const yGridLines: number[] = [];
  for (let v = Math.ceil(minV / step) * step; v <= maxV; v += step) {
    yGridLines.push(v);
  }

  const threshY = thresholdLine
    ? CHART_TOP + (1 - normalize(thresholdLine.value, minV, maxV)) * (CHART_BOT - CHART_TOP)
    : null;

  // SVG defs id for drop shadow
  const filterId = `glow-${title.replace(/\s/g, '')}`;
  const gradIdTmax = `grad-tmax-${title.replace(/\s/g, '')}`;
  const gradIdTmin = `grad-tmin-${title.replace(/\s/g, '')}`;

  // Hover handler via SVG mouse move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VW;
    const chartX = svgX - PAD_L;
    if (chartX < 0 || chartX > cw) { setHovered(null); return; }
    const idx = Math.round((chartX / cw) * (n - 1));
    setHovered(Math.max(0, Math.min(n - 1, idx)));
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(17,17,17,0.08)',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* ── Subtle grain texture overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
          opacity: 0.12,
          borderRadius: '16px',
        }}
      />

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-1 relative z-10">
        <div>
          <div
            className="flex items-baseline gap-3 transition-all duration-600"
            style={{ opacity: animPhase >= 1 ? 1 : 0, transform: animPhase >= 1 ? 'none' : 'translateY(8px)' }}
          >
            <h3
              className="font-bold tracking-tight"
              style={{ fontSize: '15px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: '#111111' }}
            >
              {title}
            </h3>
            {subtitle && (
              <span
                className="transition-opacity duration-500"
                style={{ fontSize: '10px', fontVariantNumeric: 'tabular-nums', color: '#444444' }}
              >
                {subtitle}
              </span>
            )}
          </div>

          {/* Live value readout — shows current hover value or last value */}
          <div
            className="flex items-center gap-5 mt-2 transition-all duration-500"
            style={{ opacity: animPhase >= 2 ? 1 : 0 }}
          >
            {data.series.map((s) => {
              const displayIdx = hovered !== null ? hovered : n - 1;
              const val = s.values[displayIdx];
              return (
                <div key={s.label} className="flex items-center gap-2">
                  <div
                    className="w-5 h-0.5 rounded-full"
                    style={{ background: s.color, opacity: 0.9 }}
                  />
                  <span
                    className="font-medium"
                    style={{ fontSize: '11px', color: '#444444' }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="font-bold tabular-nums"
                    style={{ fontSize: '13px', color: s.color, letterSpacing: '-0.01em' }}
                  >
                    {typeof val === 'number' ? val.toFixed(1) : val}{yUnit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Period pills — horizontal strip */}
        <div
          className="flex items-center gap-1 transition-all duration-500"
          style={{ opacity: animPhase >= 2 ? 1 : 0, transitionDelay: '100ms' }}
        >
          {periods.map((p) => (
            <button
              key={p.label}
              onClick={() => onPeriodChange(p.label)}
              className="flex items-center gap-1.5 rounded-full transition-all duration-200 active:scale-95"
              style={{
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                background: selectedPeriod === p.label
                  ? '#2D5A27'
                  : 'rgba(45,90,39,0.08)',
                border: selectedPeriod === p.label
                  ? '1px solid #2D5A27'
                  : '1px solid rgba(45,90,39,0.14)',
                color: selectedPeriod === p.label
                  ? '#FFFFFF'
                  : '#2D5A27',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  background: selectedPeriod === p.label ? 'currentColor' : 'rgba(45,90,39,0.3)',
                }}
              />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SVG chart ── */}
      <div className="px-2 pb-1 pt-1 relative z-10">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${TOTAL_H}`}
          className="w-full h-auto"
          style={{ display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            {/* Tmax drop shadow / glow */}
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feFlood floodColor={data.series[0]?.color ?? '#fff'} floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Area gradients for each series */}
            {data.series.map((s, si) => (
              <linearGradient
                key={`lg-${si}`}
                id={si === 0 ? gradIdTmax : gradIdTmin}
                x1="0" y1="0" x2="0" y2="1"
              >
                <stop offset="0%" stopColor={s.areaColor ?? s.color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={s.areaColor ?? s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* ── Y-axis grid lines ── */}
          {yGridLines.map(v => {
            const y = CHART_TOP + (1 - normalize(v, minV, maxV)) * (CHART_BOT - CHART_TOP);
            const isZero = v === 0;
            return (
              <g key={v}>
                <line
                  x1={PAD_L} y1={y} x2={VW - PAD_R} y2={y}
                  stroke={isZero ? 'rgba(17,17,17,0.10)' : 'rgba(17,17,17,0.055)'}
                  strokeWidth={isZero ? '0.8' : '0.6'}
                />
                <text
                  x={PAD_L - 5} y={y + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="'SF Mono', 'Fira Mono', monospace"
                  fill="rgba(68,68,68,0.55)"
                >
                  {v}{yUnit}
                </text>
              </g>
            );
          })}

          {/* ── Highlight bands (heat events) ── */}
          {highlightBands?.map((band, i) => {
            const x1 = PAD_L + (band.startIdx / (n - 1)) * cw;
            const x2 = PAD_L + (Math.min(band.endIdx, n - 1) / (n - 1)) * cw;
            return (
              <rect
                key={i}
                x={x1} y={CHART_TOP}
                width={Math.max(x2 - x1, 2)}
                height={CHART_BOT - CHART_TOP}
                fill={band.color}
                rx="1"
              />
            );
          })}

          {/* ── 34°C threshold line ── */}
          {threshY !== null && thresholdLine && (
            <g>
              <line
                x1={PAD_L} y1={threshY}
                x2={VW - PAD_R} y2={threshY}
                stroke={thresholdLine.color}
                strokeWidth="1.2"
                strokeDasharray="8,5"
                opacity="0.6"
              />
              <rect
                x={VW - PAD_R - 68} y={threshY - 12}
                width="66" height="13"
                rx="3"
                fill={`${thresholdLine.color}22`}
              />
              <text
                x={VW - PAD_R - 35} y={threshY - 3}
                textAnchor="middle"
                fontSize="8.5"
                fontFamily="'SF Mono', 'Fira Mono', monospace"
                fill={thresholdLine.color}
                opacity="0.85"
              >
                {thresholdLine.label}
              </text>
            </g>
          )}

          {/* ── Area fills (smooth gradient under each line) ── */}
          {data.series.map((s, si) => (
            <path
              key={`area-${si}`}
              d={smoothPath(s.values, maxV, minV, CHART_TOP, CHART_BOT, true)}
              fill={`url(#${si === 0 ? gradIdTmax : gradIdTmin})`}
              className="transition-opacity duration-700"
              style={{ opacity: visible ? 1 : 0, transitionDelay: `${si * 150}ms` }}
            />
          ))}

          {/* ── Line paths ── */}
          {data.series.map((s, si) => {
            const isTmax = si === 0;
            return (
              <path
                key={`line-${si}`}
                d={smoothPath(s.values, maxV, minV, CHART_TOP, CHART_BOT)}
                fill="none"
                stroke={s.color}
                strokeWidth={isTmax ? (s.strokeWidth ?? 2.5) : (s.strokeWidth ?? 1.5)}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isTmax ? `url(#${filterId})` : undefined}
                className="transition-all duration-900"
                style={{
                  opacity: visible ? 1 : 0,
                  transitionDelay: `${si * 200}ms`,
                }}
              />
            );
          })}

          {/* ── Hover vertical crosshair ── */}
          {hovered !== null && (() => {
            const hx = PAD_L + (hovered / (n - 1)) * cw;
            return (
              <line
                x1={hx} y1={CHART_TOP}
                x2={hx} y2={BAR_BOT}
                stroke="rgba(17,17,17,0.18)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            );
          })()}

          {/* ── Hover dots (only appear on hover) ── */}
          {hovered !== null && data.series.map((s, si) => {
            const hx = PAD_L + (hovered / (n - 1)) * cw;
            const hy = CHART_TOP + (1 - normalize(s.values[hovered], minV, maxV)) * (CHART_BOT - CHART_TOP);
            return (
              <g key={`hover-dot-${si}`}>
                <circle cx={hx} cy={hy} r="5" fill="#FFFFFF" stroke={s.color} strokeWidth="2" />
                <circle cx={hx} cy={hy} r="2" fill={s.color} />
              </g>
            );
          })}

          {/* ── Hover tooltip ── */}
          {hovered !== null && (() => {
            const hx = PAD_L + (hovered / (n - 1)) * cw;
            const tooltipW = 96;
            const tooltipH = 14 + data.series.length * 16;
            const tx = Math.min(Math.max(hx - tooltipW / 2, PAD_L), VW - PAD_R - tooltipW);
            const ty = CHART_TOP + 6;
            return (
              <g>
                <rect
                  x={tx} y={ty}
                  width={tooltipW} height={tooltipH}
                  rx="5"
                  fill="#FFFFFF"
                  stroke="rgba(17,17,17,0.12)"
                  strokeWidth="0.8"
                />
                <text
                  x={tx + tooltipW / 2} y={ty + 11}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="'SF Mono', 'Fira Mono', monospace"
                  fontWeight="600"
                  fill="#444444"
                >
                  {data.dates[hovered]}
                </text>
                {data.series.map((s, si) => (
                  <text
                    key={si}
                    x={tx + tooltipW / 2} y={ty + 11 + 14 + si * 14}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="'SF Mono', 'Fira Mono', monospace"
                    fontWeight="700"
                    fill={s.color}
                  >
                    {s.label} {s.values[hovered].toFixed(1)}{yUnit}
                  </text>
                ))}
              </g>
            );
          })()}

          {/* ── Chart panel label ── */}
          <text
            x={PAD_L + 2} y={CHART_TOP - 6}
            fontSize="8.5"
            fontFamily="'SF Mono', 'Fira Mono', monospace"
            letterSpacing="0.08em"
            fill="rgba(68,68,68,0.65)"
          >
            {data.series.map(s => s.label).join(' · ')} {yUnit && `(${yUnit})`}
          </text>

          {/* ── Separator ── */}
          <line
            x1={PAD_L} y1={SEP_Y}
            x2={VW - PAD_R} y2={SEP_Y}
            stroke="rgba(17,17,17,0.08)"
            strokeWidth="0.6"
          />

          {/* ── Precipitation bars ── */}
          {barSeries && (() => {
            const bw = cw / barSeries.values.length;
            const pmax = Math.max(...barSeries.values, 5);
            return (
              <>
                <text
                  x={PAD_L + 2} y={BAR_TOP + 9}
                  fontSize="8.5"
                  fontFamily="'SF Mono', 'Fira Mono', monospace"
                  letterSpacing="0.08em"
                  fill="rgba(68,68,68,0.55)"
                >
                  {barSeries.label.toUpperCase()}
                </text>
                {barSeries.values.map((v, i) => {
                  const bx = PAD_L + i * bw;
                  const bh = normalize(v, 0, pmax) * (BAR_BOT - BAR_TOP - 12);
                  const by = BAR_BOT - bh;
                  const wet = v >= barSeries.rainThreshold;
                  const isHov = hovered === i;
                  return (
                    <rect
                      key={i}
                      x={bx + 0.3} y={by}
                      width={Math.max(bw - 0.6, 0.5)}
                      height={Math.max(bh, 0.5)}
                      rx="1"
                      fill={wet
                        ? (isHov ? barSeries.rainColor : barSeries.rainColor)
                        : barSeries.dryColor}
                      opacity={wet ? (isHov ? 1 : 0.75) : 0.35}
                      style={{
                        opacity: visible ? undefined : 0,
                        transition: `opacity 0.5s ease ${1000 + i * 6}ms`,
                      }}
                    />
                  );
                })}
              </>
            );
          })()}

          {/* ── X-axis labels ── */}
          {tickIdxs.map((idx, ti) => {
            const x = PAD_L + (idx / (n - 1)) * cw;
            const anchor = ti === 0 ? 'start' : ti === tickIdxs.length - 1 ? 'end' : 'middle';
            return (
              <text
                key={idx}
                x={x} y={XAXIS_Y}
                textAnchor={anchor}
                fontSize="10"
                fontFamily="'SF Mono', 'Fira Mono', monospace"
                fill="rgba(68,68,68,0.75)"
                style={{ opacity: visible ? 1 : 0, transition: `opacity 0.4s ease 1200ms` }}
              >
                {data.dates[idx]}
              </text>
            );
          })}
        </svg>
      </div>

      {/* ── Bottom metrics strip ── */}
      <div
        className="flex gap-0 border-t mx-0 transition-all duration-600"
        style={{
          borderColor: 'rgba(17,17,17,0.08)',
          opacity: animPhase >= 3 ? 1 : 0,
          transform: animPhase >= 3 ? 'none' : 'translateY(6px)',
        }}
      >
        {data.metrics.map((m, i) => (
          <div
            key={m.label}
            className="flex-1 flex flex-col justify-center px-4 py-3 transition-all duration-300"
            style={{
              borderRight: i < data.metrics.length - 1 ? '1px solid rgba(17,17,17,0.08)' : 'none',
              transitionDelay: `${i * 80}ms`,
              background: 'transparent',
            }}
          >
            <div
              className="font-bold tabular-nums leading-none"
              style={{
                fontSize: '17px',
                color: m.accent ?? '#111111',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {m.value}
            </div>
            <div
              className="mt-1 uppercase tracking-wider"
              style={{ fontSize: '9px', color: '#444444', letterSpacing: '0.08em' }}
            >
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
