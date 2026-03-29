import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';

const STEPS = [
  { label: 'Fetching Sentinel-2 imagery…',         duration: 1200 },
  { label: 'Computing NDVI indices…',               duration: 1000 },
  { label: 'Classifying field health zones…',       duration: 1100 },
  { label: 'Identifying priority fields…',          duration: 900  },
  { label: 'Building vegetation health layer…',     duration: 1000 },
  { label: 'Generating priority overlays…',         duration: 800  },
  { label: 'Finalizing satellite layers…',          duration: 700  },
];

interface Props {
  farmAddress: string;
  farmSize: string;
  onComplete: () => void;
}

export default function LayerAnalyzingView({ farmAddress, farmSize, onComplete }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const total = STEPS.reduce((s, step) => s + step.duration, 0);
    let stepStart = 0;
    let currentStep = 0;

    const tick = setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / total) * 100, 99));

      // Advance steps based on cumulative durations
      let cumulativeDuration = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cumulativeDuration += STEPS[i].duration;
        if (elapsed < cumulativeDuration) {
          if (i !== currentStep) {
            currentStep = i;
            setStepIdx(i);
            stepStart = elapsed;
          }
          break;
        }
      }

      if (elapsed >= total) {
        clearInterval(tick);
        setProgress(100);
        setTimeout(onComplete, 500);
      }
    }, 50);

    return () => clearInterval(tick);
  }, [onComplete]);

  stepIdx; // used in render

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      style={{ background: 'linear-gradient(160deg, #060e06 0%, #0a160a 50%, #060a0a 100%)' }}
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
      transition={springDefault}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Satellite scan animation */}
      <div className="relative mb-10">
        {/* Outer ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(34,197,94,0.2)' }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(34,197,94,0.15)' }}
          animate={{ scale: [1, 2.2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />

        {/* Scanning square with corner marks */}
        <div
          className="relative w-24 h-24 flex items-center justify-center"
          style={{ border: '1px solid rgba(34,197,94,0.15)' }}
        >
          {/* Corner brackets */}
          {[['top-0 left-0', 'border-t border-l'], ['top-0 right-0', 'border-t border-r'], ['bottom-0 left-0', 'border-b border-l'], ['bottom-0 right-0', 'border-b border-r']].map(([pos, borders], i) => (
            <span
              key={i}
              className={`absolute w-3 h-3 ${pos} ${borders}`}
              style={{ borderColor: 'rgba(34,197,94,0.8)' }}
            />
          ))}

          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px"
            style={{ background: 'linear-gradient(to right, transparent, #4ade80, transparent)' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Center label */}
          <div className="text-center z-10">
            <div className="text-[9px] font-bold text-green-400/60 tracking-widest uppercase">SAT</div>
            <div className="text-[9px] font-bold text-green-400/60 tracking-widest uppercase">SCAN</div>
          </div>
        </div>
      </div>

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-[20px] font-bold text-white mb-1">Analyzing Your Farm</h2>
        <p className="text-[12px] text-white/35 truncate max-w-xs">{farmAddress}</p>
        <p className="text-[11px] text-white/25 mt-0.5">{farmSize} acres</p>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(to right, #16a34a, #4ade80)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-white/30">{Math.round(progress)}%</span>
          <span className="text-[11px] text-green-400/50">{progress < 100 ? 'Processing…' : 'Complete'}</span>
        </div>
      </div>

      {/* Current step */}
      <motion.div
        className="text-center"
        key={stepIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-[13px] text-white/50">{STEPS[stepIdx]?.label ?? 'Finalizing…'}</p>
      </motion.div>

      {/* Completed steps */}
      <div className="mt-5 flex flex-col gap-1 w-full max-w-xs">
        {STEPS.slice(0, stepIdx).map((step, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            </span>
            <span className="text-[11px] text-white/25 truncate">{step.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
