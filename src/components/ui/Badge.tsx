import { motion } from 'framer-motion';
import type { DemoPhase } from '../../types';

interface Props {
  phase: DemoPhase;
}

export default function Badge({ phase }: Props) {
  const isProminent = phase === 'results' || phase === 'context';
  const isNASA = phase === 'context';

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 z-40 flex items-center gap-2 px-4 py-2 glass"
      style={{ x: '-50%' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isProminent ? [1, 1.04, 1] : 1,
      }}
      transition={{
        opacity: { delay: 1, duration: 0.5 },
        scale: isProminent
          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          : undefined,
      }}
    >
      {/* Pulsing green dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>

      <span className="text-xs font-medium text-white/70 whitespace-nowrap">
        {isNASA ? 'NASA POWER · Live satellite data' : 'Running locally on your device'}
      </span>
    </motion.div>
  );
}
