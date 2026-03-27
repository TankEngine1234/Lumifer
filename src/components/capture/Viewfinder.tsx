import { motion } from 'framer-motion';
import { springDefault } from '../../animations/springs';

interface Props {
  isLocked: boolean;
}

// Corner bracket component — L-shaped SVG path
function Corner({ position, isLocked }: { position: 'tl' | 'tr' | 'bl' | 'br'; isLocked: boolean }) {
  const size = 40;
  const offset = isLocked ? 20 : 0; // Brackets tighten inward when locked

  const transforms: Record<string, { x: number; y: number; rotate: number }> = {
    tl: { x: offset, y: offset, rotate: 0 },
    tr: { x: -offset, y: offset, rotate: 90 },
    br: { x: -offset, y: -offset, rotate: 180 },
    bl: { x: offset, y: -offset, rotate: 270 },
  };

  const positionClasses: Record<string, string> = {
    tl: 'top-0 left-0',
    tr: 'top-0 right-0',
    br: 'bottom-0 right-0',
    bl: 'bottom-0 left-0',
  };

  const t = transforms[position];

  return (
    <motion.div
      className={`absolute ${positionClasses[position]}`}
      animate={{
        x: t.x,
        y: t.y,
        opacity: isLocked ? 1 : [0.6, 1, 0.6],
        scale: isLocked ? 1 : [1, 1.02, 1],
      }}
      transition={
        isLocked
          ? springDefault
          : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: `rotate(${t.rotate}deg)` }}
      >
        <path
          d={`M 2 ${size} L 2 2 L ${size} 2`}
          fill="none"
          stroke={isLocked ? '#22C55E' : 'white'}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

export default function Viewfinder({ isLocked }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: '70vw', height: '70vw', maxWidth: 300, maxHeight: 300 }}>
        <Corner position="tl" isLocked={isLocked} />
        <Corner position="tr" isLocked={isLocked} />
        <Corner position="bl" isLocked={isLocked} />
        <Corner position="br" isLocked={isLocked} />

        {/* Lock glow */}
        {isLocked && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-green-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.3] }}
            transition={{ duration: 1 }}
          />
        )}
      </div>
    </div>
  );
}
