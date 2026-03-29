import { motion } from 'framer-motion';

const zones = [
  { x: '10%', y: '15%', w: '35%', h: '25%', color: 'rgba(45, 90, 39, 0.18)', delay: 0.3 },
  { x: '55%', y: '55%', w: '30%', h: '20%', color: 'rgba(74, 122, 68, 0.16)', delay: 0.5 },
  { x: '50%', y: '20%', w: '25%', h: '15%', color: 'rgba(17, 17, 17, 0.16)', delay: 0.7 },
  { x: '15%', y: '60%', w: '20%', h: '18%', color: 'rgba(107, 145, 101, 0.18)', delay: 0.9 },
  { x: '60%', y: '35%', w: '22%', h: '18%', color: 'rgba(17, 17, 17, 0.2)', delay: 1.1 },
];

export default function NDVIOverlay() {
  return (
    <div className="absolute inset-0 z-10">
      {zones.map((zone, i) => (
        <motion.div
          key={i}
          className="absolute rounded-lg"
          style={{
            left: zone.x,
            top: zone.y,
            width: zone.w,
            height: zone.h,
            background: zone.color,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: zone.delay, duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
