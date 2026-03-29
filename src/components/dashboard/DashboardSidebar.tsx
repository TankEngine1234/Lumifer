import { motion } from 'framer-motion';
import {
  Leaf, MapPin, TrendingDown,
  Droplets, Sun, ThermometerSun, BarChart3,
} from 'lucide-react';
import type { NPKResult } from '../../types';
import { staggerContainer, staggerItem } from '../../animations/variants';
import { capitalize } from '../../utils/format';

interface Props {
  result: NPKResult | null;
}

// ── Stat card ──
function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trendLabel,
  trendUp,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: typeof Leaf;
  trendLabel?: string;
  trendUp?: boolean;
}) {
  return (
    <div style={{
      background: '#F7F7F5',
      border: '1px solid rgba(17,17,17,0.07)',
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(68,68,68,0.7)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(68,68,68,0.4)' }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111111', lineHeight: 1.1 }}>{value}</div>
      {trendLabel && (
        <div className="flex items-center gap-1 mt-1">
          <span style={{ fontSize: 11, fontWeight: 600, color: trendUp ? '#2D5A27' : '#C0392B' }}>
            {trendLabel}
          </span>
        </div>
      )}
      {subtitle && !trendLabel && (
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(68,68,68,0.6)', marginTop: 2 }}>{subtitle}</p>
      )}
    </div>
  );
}

// ── Nutrient bar ──
function NutrientBar({
  label,
  value,
  level,
  color,
}: {
  label: string;
  value: number;
  level: string;
  color: string;
}) {
  const pct = Math.round(value * 100);
  const isDeficient = level === 'deficient';
  const badgeColor = isDeficient ? '#C0392B' : level === 'adequate' ? '#B7770D' : '#2D5A27';
  const badgeBg = isDeficient ? 'rgba(192,57,43,0.10)' : level === 'adequate' ? 'rgba(183,119,13,0.10)' : 'rgba(45,90,39,0.10)';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111111' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            color: badgeColor, background: badgeBg,
          }}>
            {capitalize(level)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: isDeficient ? '#C0392B' : color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── 30-Day History Chart ──
const generateMockHistory = () => {
  const data = [];
  let health = 70 + Math.random() * 10;
  for (let i = 30; i >= 1; i--) {
    health += (Math.random() - 0.45) * 4;
    health = Math.max(40, Math.min(95, health));
    data.push({ day: i, health: Math.round(health) });
  }
  return data.reverse();
};

const MOCK_HISTORY = generateMockHistory();

function HealthHistoryChart() {
  return (
    <div>
      <p className="section-label mb-3">30-Day Health Trend</p>
      <div style={{ background: '#F7F7F5', border: '1px solid rgba(17,17,17,0.07)', borderRadius: 12, padding: '12px 14px' }}>
        <div className="flex items-end justify-between gap-px" style={{ height: 64 }}>
          {MOCK_HISTORY.map(({ day, health }) => (
            <div key={day} className="w-full flex flex-col items-center justify-end" title={`Day ${31 - day}: ${health}%`}>
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${health}%`, background: 'rgba(45,90,39,0.28)' }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1" style={{ fontSize: 10, color: 'rgba(68,68,68,0.55)', fontWeight: 600 }}>
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSidebar({ result }: Props) {
  return (
    <motion.aside
      className="flex flex-col h-full w-full"
      style={{ background: '#FFFFFF', borderRight: '1px solid rgba(17,17,17,0.08)' }}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(17,17,17,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2D5A27' }}>
            <Leaf className="w-4 h-4" style={{ color: '#FFFFFF' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#111111', lineHeight: 1.2 }}>Lumifer</h2>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(68,68,68,0.6)' }}>Crop Intelligence</p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Active zone */}
        <motion.div variants={staggerItem}>
          <p className="section-label mb-2">Active Zone</p>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F7F7F5', border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(45,90,39,0.12)' }}>
              <MapPin className="w-4 h-4" style={{ color: '#2D5A27' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>Zone A3</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(68,68,68,0.6)' }}>Lat 30.62° · Lon -96.34°</p>
            </div>
          </div>
        </motion.div>

        {/* Overview stats */}
        <motion.div variants={staggerItem}>
          <p className="section-label mb-2">Overview</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Health Score"
              value={result ? `${Math.round((1 - Math.max(result.nitrogen.confidence, result.phosphorus.confidence, result.potassium.confidence)) * 100)}%` : '--'}
              icon={BarChart3}
              trendLabel={result ? (result.severity === 'low' ? '+5.2% from last' : '-12.4% from last') : undefined}
              trendUp={result?.severity === 'low'}
            />
            <StatCard
              label="Yield Impact"
              value={result ? `${result.yieldImpact}%` : '--'}
              icon={TrendingDown}
              subtitle="Estimated loss"
            />
            <StatCard
              label="Soil Moisture"
              value="42%"
              icon={Droplets}
              trendLabel="+3.1% this week"
              trendUp
            />
            <StatCard
              label="Temperature"
              value="28°C"
              icon={ThermometerSun}
              subtitle="Avg. last 7 days"
            />
          </div>
        </motion.div>

        {/* Nutrient breakdown */}
        {result && (
          <motion.div variants={staggerItem}>
            <p className="section-label mb-2">Nutrient Levels</p>
            <div className="space-y-4 p-4 rounded-xl" style={{ background: '#F7F7F5', border: '1px solid rgba(17,17,17,0.07)' }}>
              <NutrientBar label="Nitrogen (N)" value={result.nitrogen.confidence} level={result.nitrogen.level} color="#2D5A27" />
              <NutrientBar label="Phosphorus (P)" value={result.phosphorus.confidence} level={result.phosphorus.level} color="#4A7A44" />
              <NutrientBar label="Potassium (K)" value={result.potassium.confidence} level={result.potassium.level} color="#6B9165" />
            </div>
          </motion.div>
        )}

        {/* 30-day history */}
        <motion.div variants={staggerItem}>
          <HealthHistoryChart />
        </motion.div>

        {/* Environmental context */}
        <motion.div variants={staggerItem}>
          <p className="section-label mb-2">Environment</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            {[
              { icon: Sun, color: '#D4930A', label: 'Solar Radiation', value: '18.4 MJ/m²' },
              { icon: Droplets, color: '#2980B9', label: 'Precipitation', value: '12.3 mm' },
              { icon: ThermometerSun, color: '#C0392B', label: 'Humidity', value: '67%' },
            ].map(({ icon: Icon, color, label, value }, i) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: i % 2 === 0 ? '#FFFFFF' : '#F7F7F5',
                  borderBottom: i < 2 ? '1px solid rgba(17,17,17,0.05)' : undefined,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111111' }}>{label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(45,90,39,0.12)' }}>
            <Leaf className="w-3.5 h-3.5" style={{ color: '#2D5A27' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111111' }} className="truncate">Field Operator</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(68,68,68,0.6)' }} className="truncate">Zone A3 · Active</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
