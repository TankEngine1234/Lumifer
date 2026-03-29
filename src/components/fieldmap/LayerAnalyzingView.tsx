import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';

const STEPS = [
  { label: 'Fetching Sentinel-2 imagery...', duration: 1200 },
  { label: 'Computing NDVI indices...', duration: 1000 },
  { label: 'Classifying field health zones...', duration: 1100 },
  { label: 'Identifying priority fields...', duration: 900 },
  { label: 'Building vegetation health layer...', duration: 1000 },
  { label: 'Generating priority overlays...', duration: 800 },
  { label: 'Finalizing satellite layers...', duration: 700 },
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
    let currentStep = 0;

    const tick = setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / total) * 100, 99));

      let cumulativeDuration = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cumulativeDuration += STEPS[i].duration;
        if (elapsed < cumulativeDuration) {
          if (i !== currentStep) {
            currentStep = i;
            setStepIdx(i);
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

  return (
    <motion.div
      className="app-page items-center justify-center px-4"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
      transition={springDefault}
    >
      <div className="w-full max-w-[480px] app-card p-6">
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '1px solid rgba(45,90,39,0.16)' }}
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '1px solid rgba(45,90,39,0.12)' }}
              animate={{ scale: [1, 2.1, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            />

            <div
              className="relative w-24 h-24 flex items-center justify-center rounded-2xl"
              style={{ border: '2px solid rgba(45,90,39,0.16)', background: 'rgba(45,90,39,0.04)' }}
            >
              {[['top-0 left-0', 'border-t border-l'], ['top-0 right-0', 'border-t border-r'], ['bottom-0 left-0', 'border-b border-l'], ['bottom-0 right-0', 'border-b border-r']].map(([pos, borders], i) => (
                <span
                  key={i}
                  className={`absolute w-4 h-4 ${pos} ${borders}`}
                  style={{ borderColor: '#2D5A27' }}
                />
              ))}

              <motion.div
                className="absolute left-0 right-0 h-px"
                style={{ background: 'linear-gradient(to right, transparent, #2D5A27, transparent)' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />

              <div className="text-center z-10">
                <div className="section-label" style={{ color: '#2D5A27' }}>SAT</div>
                <div className="section-label" style={{ color: '#2D5A27' }}>SCAN</div>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-[24px] font-extrabold" style={{ color: '#111111' }}>Analyzing Your Farm</h2>
          <p className="app-text truncate mt-2">{farmAddress}</p>
          <p className="section-label mt-1">{farmSize} acres</p>
        </motion.div>

        <div className="mb-5">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#2D5A27' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="section-label">{Math.round(progress)}%</span>
            <span className="section-label" style={{ color: '#2D5A27' }}>{progress < 100 ? 'Processing...' : 'Complete'}</span>
          </div>
        </div>

        <motion.div
          className="text-center"
          key={stepIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="app-text">{STEPS[stepIdx]?.label ?? 'Finalizing...'}</p>
        </motion.div>

        <div className="mt-5 flex flex-col gap-2">
          {STEPS.slice(0, stepIdx).map((step, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(45,90,39,0.12)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#2D5A27' }} />
              </span>
              <span className="section-label truncate">{step.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
