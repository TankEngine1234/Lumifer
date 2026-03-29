import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, ArrowLeft, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { HistoryScan } from '../../types';
import { staggerContainer, staggerItem } from '../../animations/variants';
import { springDefault } from '../../animations/springs';

interface Props {
  scans: HistoryScan[];
  selectedScanId: string | null;
  onSelectScan: (scan: HistoryScan) => void;
  onBack: () => void;
}

// Nutrient pill: red if critical (<40), amber if warning (<60), green if ok
function NutrientPill({ label, value }: { label: string; value: number }) {
  const color =
    value < 40 ? '#f87171' : // red-400
    value < 60 ? '#fb923c' : // orange-400
    '#4ade80';               // green-400

  return (
    <span
      className="inline-flex items-center justify-center text-[9px] font-bold rounded px-1.5 py-0.5 tabular-nums"
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
      <span className="ml-0.5 font-mono text-[8px] opacity-80">{value}</span>
    </span>
  );
}

// Delta arrow between current and previous scan for a nutrient
function DeltaIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 2) {
    return <Minus className="w-3 h-3 text-white/30" />;
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center text-[9px] text-green-400 font-mono">
        <TrendingUp className="w-3 h-3 mr-0.5" />+{diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[9px] text-red-400 font-mono">
      <TrendingDown className="w-3 h-3 mr-0.5" />{diff}
    </span>
  );
}

// Tiny inline sparkline for nitrogen over time
function Sparkline({ values, width = 80, height = 20 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  // Color based on trend: is the end lower than the start?
  const declining = values[values.length - 1] < values[0] - 5;
  const stroke = declining ? '#f87171' : '#4ade80';

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

// Detect if nitrogen is declining over a window of consecutive scans
function detectNitrogenDecline(scans: HistoryScan[]): { declining: boolean; streakDays: number } {
  // scans are oldest-first; look for consecutive drops in nitrogen
  let maxStreak = 0;
  let currentStreak = 0;

  for (let i = 1; i < scans.length; i++) {
    if (scans[i].nitrogen_grade < scans[i - 1].nitrogen_grade - 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return { declining: maxStreak >= 4, streakDays: maxStreak };
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistorySidebar({ scans, selectedScanId, onSelectScan, onBack }: Props) {
  const [filter, setFilter] = useState<'all' | 'critical'>('all');

  // Scans sorted newest-first for display
  const sorted = useMemo(() => [...scans].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [scans]);

  const filtered = useMemo(() => {
    if (filter === 'critical') return sorted.filter(s => s.nitrogen_grade < 40 || s.phosphorus_grade < 40 || s.potassium_grade < 40);
    return sorted;
  }, [sorted, filter]);

  // Oldest-first for sparkline and decline detection
  const oldestFirst = useMemo(() => [...scans].sort((a, b) => a.timestamp.localeCompare(b.timestamp)), [scans]);
  const nitrogenValues = useMemo(() => oldestFirst.map(s => s.nitrogen_grade), [oldestFirst]);
  const decline = useMemo(() => detectNitrogenDecline(oldestFirst), [oldestFirst]);

  // Build a map from scan_id → previous scan (by date order, newest-first)
  const prevMap = useMemo(() => {
    const map = new Map<string, HistoryScan>();
    for (let i = 0; i < sorted.length - 1; i++) {
      map.set(sorted[i].scan_id, sorted[i + 1]);
    }
    return map;
  }, [sorted]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ background: '#0a0a0a' }}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <motion.button
            className="p-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.92 }}
            transition={springDefault}
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </motion.button>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Scan History
            </h2>
            <p className="text-[10px] text-white/40 mt-0.5">Zone A3 · Last 30 days</p>
          </div>
        </div>

        {/* Nitrogen sparkline overview */}
        <motion.div
          variants={staggerItem}
          className="p-3 rounded-xl mb-3"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Nitrogen Trend</span>
            <span className="text-[10px] text-white/40 tabular-nums">{scans.length} scans</span>
          </div>
          <Sparkline values={nitrogenValues} width={260} height={28} />
        </motion.div>

        {/* Diminishing health warning */}
        <AnimatePresence>
          {decline.declining && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 p-3 rounded-xl mb-3"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.25)',
              }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-400">Diminishing Health Detected</p>
                <p className="text-[10px] text-red-400/70 mt-0.5 leading-relaxed">
                  Nitrogen dropped for {decline.streakDays} consecutive scans. Consider urea application at 150 kg/ha.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'critical'] as const).map(f => (
            <button
              key={f}
              className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filter === f ? '#fff' : 'rgba(255,255,255,0.35)',
                border: filter === f ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All (${sorted.length})` : `Critical (${sorted.filter(s => s.nitrogen_grade < 40 || s.phosphorus_grade < 40 || s.potassium_grade < 40).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Scan list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
          {filtered.map((scan) => {
            const prev = prevMap.get(scan.scan_id) ?? null;
            const isSelected = scan.scan_id === selectedScanId;

            return (
              <motion.button
                key={scan.scan_id}
                variants={staggerItem}
                className="w-full text-left p-3 rounded-xl transition-colors"
                style={{
                  background: isSelected ? 'rgba(96,165,250,0.1)' : '#141414',
                  border: isSelected ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}
                whileTap={{ scale: 0.98 }}
                transition={springDefault}
                onClick={() => onSelectScan(scan)}
              >
                {/* Row 1: date + health score */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{scan.leaf_image_snippet}</span>
                    <span className="text-xs font-semibold text-white">{formatDate(scan.timestamp)}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                    style={{
                      color: scan.overall_health_score < 50 ? '#f87171' : scan.overall_health_score < 65 ? '#fb923c' : '#4ade80',
                      backgroundColor: scan.overall_health_score < 50 ? 'rgba(248,113,113,0.12)' : scan.overall_health_score < 65 ? 'rgba(251,146,60,0.12)' : 'rgba(74,222,128,0.12)',
                    }}
                  >
                    {scan.overall_health_score}%
                  </span>
                </div>

                {/* Row 2: NPK pill badges */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <NutrientPill label="N" value={scan.nitrogen_grade} />
                  <NutrientPill label="P" value={scan.phosphorus_grade} />
                  <NutrientPill label="K" value={scan.potassium_grade} />
                </div>

                {/* Row 3: Delta indicators from previous scan */}
                {prev && (
                  <div className="flex items-center gap-3 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-[9px] text-white/30 mr-1">Δ</span>
                    <DeltaIndicator current={scan.nitrogen_grade} previous={prev.nitrogen_grade} />
                    <DeltaIndicator current={scan.phosphorus_grade} previous={prev.phosphorus_grade} />
                    <DeltaIndicator current={scan.potassium_grade} previous={prev.potassium_grade} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
