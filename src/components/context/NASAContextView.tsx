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
  heat:     { bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.35)',    text: '#fca5a5' },
  drought:  { bg: 'rgba(234,179,8,0.15)',    border: 'rgba(234,179,8,0.35)',    text: '#fde68a' },
  humidity: { bg: 'rgba(168,85,247,0.15)',   border: 'rgba(168,85,247,0.35)',   text: '#d8b4fe' },
};

function StressPill({ label, type }: { label: string; type: keyof typeof pillColors }) {
  const c = pillColors[type];
  return (
    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{
      backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {label}
    </span>
  );
}

// NASA meatball logo as inline SVG (simplified)
function NASALogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r="48" fill="#0b3d91" />
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
      className="absolute inset-0 flex flex-col px-4 pt-12 pb-24"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="text-center mb-4 shrink-0">
        <p className="text-[9px] font-bold tracking-[0.15em] text-white/35 uppercase mb-0.5">
          Stage 3 · Why is it stressed?
        </p>
        <h2 className="text-lg font-semibold text-white">Climate Context</h2>
        <p className="text-xs text-white/40 mt-0.5">NASA POWER · 90-day growing season analysis</p>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <motion.div variants={staggerItem} className="flex-1 flex items-center justify-center">
          <GlassCard>
            <div className="flex items-center gap-3 px-2 py-1">
              <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-white">Fetching NASA data…</p>
                <p className="text-xs text-white/40 mt-0.5">power.larc.nasa.gov · AG community</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Error / Offline */}
      {isError && (
        <motion.div variants={staggerItem} className="flex-1 flex items-center justify-center">
          <GlassCard>
            <div className="flex items-start gap-3 px-1">
              {climate.status === 'offline'
                ? <WifiOff className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 text-yellow-400/70 shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-semibold text-white">
                  {climate.status === 'offline' ? 'Offline' : 'Data unavailable'}
                </p>
                <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                  {climate.status === 'offline'
                    ? 'No network connection. Climate context requires internet for first load.'
                    : 'NASA POWER API unavailable. Leaf diagnosis above remains valid — climate correlation not shown.'}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Success */}
      {isSuccess && (
        <>
          {/* Climate chart */}
          <motion.div variants={staggerItem} className="mb-3 shrink-0">
            <ClimateChart climate={climate} />
          </motion.div>

          {/* Stress summary pills */}
          <motion.div variants={staggerItem} className="flex flex-wrap gap-2 mb-3 shrink-0">
            <StressPill label={`${climate.heatDays}d heat >34°C`} type="heat" />
            <StressPill label={`${climate.droughtGap}d dry streak`} type="drought" />
            <StressPill label={`${climate.lowHumidityDays}d low RH`} type="humidity" />
          </motion.div>

          {/* Narrative card */}
          <motion.div variants={staggerItem} className="mb-3 shrink-0">
            <StressNarrativeCard npkResult={npkResult} climate={climate} delay={0.3} />
          </motion.div>

          {/* NASA attribution */}
          <motion.div variants={staggerItem} className="shrink-0">
            <div className="glass px-3 py-2 flex items-center gap-2.5">
              <NASALogo />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-white/70">NASA POWER · data.nasa.gov</p>
                <p className="text-[9px] text-white/35 truncate">
                  Agroclimatology Community · 30.57°N 96.30°W · 90-day daily
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Restart button */}
      <motion.button
        className="absolute bottom-8 left-4 right-4 py-3 rounded-2xl text-white/60 text-sm font-medium glass"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springDefault, delay: 1.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onComplete}
      >
        Restart Demo
      </motion.button>
    </motion.div>
  );
}
