import { motion } from 'framer-motion';
import {
  Leaf, MapPin, TrendingUp, TrendingDown,
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
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: typeof Leaf;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
      {(subtitle || trendLabel) && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-nitrogen" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-destructive" />}
          <span
            className={`text-xs ${
              trend === 'up' ? 'text-nitrogen' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {trendLabel || subtitle}
          </span>
        </div>
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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isDeficient
                ? 'bg-destructive/20 text-destructive'
                : level === 'adequate'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {capitalize(level)}
          </span>
          <span className="text-sm font-mono font-semibold text-foreground tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: isDeficient ? 'var(--color-destructive)' : color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── 30-Day History Chart ────────────────────────────────────────────────────

// Generate mock data for the last 30 days
const generateMockHistory = () => {
  const data = [];
  let health = 70 + Math.random() * 10; // Start with a random health
  for (let i = 30; i >= 1; i--) {
    health += (Math.random() - 0.45) * 4; // Fluctuate health slightly
    health = Math.max(40, Math.min(95, health)); // Clamp between 40% and 95%
    data.push({ day: i, health: Math.round(health) });
  }
  return data.reverse(); // so today is on the right
};

const MOCK_HISTORY = generateMockHistory();

function HealthHistoryChart() {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        30-Day Health Trend
      </h3>
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="flex items-end justify-between h-24 gap-px">
          {MOCK_HISTORY.map(({ day, health }) => (
            <div key={day} className="w-full flex flex-col items-center justify-end group" title={`Day ${31 - day}: ${health}%`}>
              <div
                className="w-full rounded-t-sm bg-green-400/30 group-hover:bg-green-400/60 transition-colors"
                style={{ height: `${health}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
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
      className="flex flex-col h-full w-full bg-sidebar border-r border-sidebar-border"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Lumifer</h2>
            <p className="text-xs text-muted-foreground">Crop Intelligence</p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Zone info */}
        <motion.div variants={staggerItem}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Active Zone
          </h3>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-phosphorus" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Zone A3</p>
              <p className="text-xs text-muted-foreground">Lat 30.62° · Lon -96.34°</p>
            </div>
          </div>
        </motion.div>

        {/* Overview stats grid */}
        <motion.div variants={staggerItem}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Health Score"
              value={result ? `${Math.round((1 - Math.max(result.nitrogen.confidence, result.phosphorus.confidence, result.potassium.confidence)) * 100)}%` : '--'}
              icon={BarChart3}
              trend={result && result.severity === 'low' ? 'up' : result ? 'down' : undefined}
              trendLabel={result ? (result.severity === 'low' ? '+5.2% from last' : '-12.4% from last') : undefined}
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
              trend="up"
              trendLabel="+3.1% this week"
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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Nutrient Levels
            </h3>
            <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
              <NutrientBar
                label="Nitrogen (N)"
                value={result.nitrogen.confidence}
                level={result.nitrogen.level}
                color="var(--color-nitrogen)"
              />
              <NutrientBar
                label="Phosphorus (P)"
                value={result.phosphorus.confidence}
                level={result.phosphorus.level}
                color="var(--color-phosphorus)"
              />
              <NutrientBar
                label="Potassium (K)"
                value={result.potassium.confidence}
                level={result.potassium.level}
                color="var(--color-potassium)"
              />
            </div>
          </motion.div>
        )}

        {/* 30-day history */}
        <motion.div variants={staggerItem}>
          <HealthHistoryChart />
        </motion.div>

        {/* Environmental context */}
        <motion.div variants={staggerItem}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Environment
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-foreground">Solar Radiation</span>
              </div>
              <span className="text-sm font-mono font-medium text-foreground tabular-nums">18.4 MJ/m²</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-foreground">Precipitation</span>
              </div>
              <span className="text-sm font-mono font-medium text-foreground tabular-nums">12.3 mm</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <ThermometerSun className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-foreground">Humidity</span>
              </div>
              <span className="text-sm font-mono font-medium text-foreground tabular-nums">67%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Field Operator</p>
            <p className="text-xs text-muted-foreground truncate">Zone A3 · Active</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
