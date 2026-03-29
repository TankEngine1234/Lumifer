import { motion } from 'framer-motion';
import type { DemoPhase } from '../../types';

interface Props {
  phase: DemoPhase;
}

export default function Badge({ phase }: Props) {
  if (phase === 'context') return null;

  const isProminent = phase === 'results';
  const isNASA = false;

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 z-40 flex items-center gap-2 px-4 py-3 glass"
      style={{ x: '-50%' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isProminent ? [1, 1.03, 1] : 1,
      }}
      transition={{
        opacity: { delay: 1, duration: 0.5 },
        scale: isProminent
          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          : undefined,
      }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2D5A27] opacity-30" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2D5A27]" />
      </span>

      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#444444' }}>
        {isNASA ? 'NASA POWER Â· Live satellite data' : 'Running locally on your device'}
      </span>
    </motion.div>
  );
}
