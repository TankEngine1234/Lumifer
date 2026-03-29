import { motion } from 'framer-motion';
import { Loader2, WifiOff, AlertCircle } from 'lucide-react';
import type { NPKResult, NASAClimateResult } from '../../types';
import { staggerContainer, staggerItem } from '../../animations/variants';
import { springDefault } from '../../animations/springs';
import GlassCard from '../ui/GlassCard';
import ClimateChart from './ClimateChart';
import StressNarrativeCard from './StressNarrativeCard';

interface Props {
  npkResult: NPKResult;
  climate: NASAClimateResult;
  onComplete: () => void;
}

const pillColors = {
  heat: { bg: 'rgba(17,17,17,0.08)', border: 'rgba(17,17,17,0.12)', text: '#111111' },
  drought: { bg: 'rgba(45,90,39,0.10)', border: 'rgba(45,90,39,0.16)', text: '#2D5A27' },
  humidity: { bg: 'rgba(74,122,68,0.10)', border: 'rgba(74,122,68,0.16)', text: '#4A7A44' },
};

function StressPill({ label, type }: { label: string; type: keyof typeof pillColors }) {
  const c = pillColors[type];
  return (
    <span
      className="text-sm font-bold px-4 py-2 rounded-full"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {label}
    </span>
  );
}

function NASALogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r="48" fill="#2D5A27" />
      <ellipse cx="50" cy="50" rx="30" ry="12" fill="none" stroke="white" strokeWidth="5" transform="rotate(-30 50 50)" />
      <text x="50" y="57" fontSize="22" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="sans-serif">NASA</text>
    </svg>
  );
}

export default function NASAContextView({ npkResult, climate, onComplete }: Props) {
  const isLoading = climate.status === 'loading' || climate.status === 'idle';
  const isError = climate.status === 'error' || climate.status === 'offline';
  const isSuccess = climate.status === 'success';

  return (
    <motion.div
      className="app-page"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem} className="page-header">
        <p className="page-header-kicker">Stage 3 • Why is it stressed?</p>
        <h2 className="page-header-title">Climate Context</h2>
        <p className="page-header-copy" style={{ marginTop: 8 }}>
          NASA POWER • 90-day growing season analysis
        </p>
      </motion.div>

      {isLoading && (
        <motion.div variants={staggerItem} className="page-content flex-1 flex items-center">
          <GlassCard className="w-full !p-5">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#2D5A27' }} />
              <div>
                <p className="app-label">Fetching NASA data...</p>
                <p className="app-text">power.larc.nasa.gov • AG community</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {isError && (
        <motion.div variants={staggerItem} className="page-content flex-1 flex items-center">
          <GlassCard className="w-full !p-5">
            <div className="flex items-start gap-3">
              {climate.status === 'offline'
                ? <WifiOff className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#2D5A27' }} />
                : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#111111' }} />
              }
              <div>
                <p className="app-label">
                  {climate.status === 'offline' ? 'Offline' : 'Data unavailable'}
                </p>
                <p className="app-text" style={{ marginTop: 8 }}>
                  {climate.status === 'offline'
                    ? 'No network connection. Climate context requires internet for first load.'
                    : 'NASA POWER API unavailable. The leaf diagnosis above remains valid, but climate correlation is not shown.'}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {isSuccess && (
        <motion.div
          variants={staggerItem}
          className="page-content flex-1 overflow-y-auto pb-24"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="app-section">
            <ClimateChart climate={climate} />

            <div className="flex flex-wrap gap-2">
              <StressPill label={`${climate.heatDays}d heat >34°C`} type="heat" />
              <StressPill label={`${climate.droughtGap}d dry streak`} type="drought" />
              <StressPill label={`${climate.lowHumidityDays}d low RH`} type="humidity" />
            </div>

            <StressNarrativeCard npkResult={npkResult} climate={climate} delay={0.3} />

            <div className="glass px-4 py-4 flex items-center gap-3">
              <NASALogo />
              <div className="min-w-0">
                <p className="section-label">NASA POWER • data.nasa.gov</p>
                <p className="app-text">
                  Agroclimatology Community • 30.57°N 96.30°W • 90-day daily
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="page-content pt-0 pb-6">
        <motion.button
          className="app-button-primary app-button-cta"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springDefault, delay: 1.2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
        >
          Restart Demo
        </motion.button>
      </div>
    </motion.div>
  );
}
