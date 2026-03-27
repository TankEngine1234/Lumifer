import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { blurFade } from '../../animations/variants';
import { springDefault, springBouncy } from '../../animations/springs';
import ZoneCard from './ZoneCard';
import { fieldZones } from '../../data/fieldZones';
import type { FieldZone } from '../../types';

interface Props {
  selectedZone?: boolean;
  onZoneSelect?: () => void;
  onScanLeaf?: () => void;
}

const ZONE_PINS: { zone: (typeof fieldZones)[number]; cx: number; cy: number }[] = [
  { zone: fieldZones[0], cx: 76, cy: 22 }, // A3 — critical, northeast
  { zone: fieldZones[1], cx: 24, cy: 68 }, // B1 — moderate, southwest
  { zone: fieldZones[2], cx: 56, cy: 38 }, // C2 — moderate, center
];

export default function FieldMapView({ selectedZone, onZoneSelect, onScanLeaf }: Props) {
  const [active, setActive] = useState<FieldZone | null>(null);

  const handlePin = (zone: FieldZone) => {
    setActive(zone);
    onZoneSelect?.();
  };

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-[#0a1a0d]"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ scale: 1.5, filter: 'blur(16px)', opacity: 0 }}
      transition={springDefault}
    >
      {/* ── SVG Satellite NDVI Field ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Field texture grain */}
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blend" />
            <feComposite in="blend" in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="softblur">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id="heatblur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {/* Satellite scan-line texture */}
          <pattern id="scanlines" x="0" y="0" width="1" height="3" patternUnits="userSpaceOnUse">
            <rect width="1" height="1" fill="rgba(0,0,0,0.08)" />
          </pattern>
          {/* Field row texture */}
          <pattern id="fieldrows" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <rect width="4" height="2" fill="rgba(0,0,0,0.12)" />
          </pattern>
        </defs>

        {/* ── Background soil/base ── */}
        <rect width="400" height="700" fill="#1a2e1a" />

        {/* ── Main field parcels (irregular polygon shapes like real agricultural fields) ── */}

        {/* Parcel 1 — Large northeast healthy field — deep NDVI green */}
        <polygon
          points="210,10 390,10 395,180 340,220 280,200 240,160 205,80"
          fill="#1a5c2a"
        />
        {/* Parcel 1 row texture */}
        <polygon
          points="210,10 390,10 395,180 340,220 280,200 240,160 205,80"
          fill="url(#fieldrows)"
          opacity="0.4"
        />

        {/* Parcel 2 — West healthy corridor */}
        <polygon
          points="10,30 180,20 200,120 170,200 80,240 10,200"
          fill="#1e6b2e"
        />
        <polygon
          points="10,30 180,20 200,120 170,200 80,240 10,200"
          fill="url(#fieldrows)"
          opacity="0.35"
        />

        {/* Parcel 3 — Center stressed zone (moderate) — olive/amber */}
        <polygon
          points="160,180 310,160 360,280 310,340 200,360 140,300 130,230"
          fill="#4a5c1a"
        />
        <polygon
          points="160,180 310,160 360,280 310,340 200,360 140,300 130,230"
          fill="url(#fieldrows)"
          opacity="0.4"
        />

        {/* Parcel 4 — Southwest moderate stress */}
        <polygon
          points="10,250 130,230 140,300 100,420 30,450 10,380"
          fill="#3d5218"
        />
        <polygon
          points="10,250 130,230 140,300 100,420 30,450 10,380"
          fill="url(#fieldrows)"
          opacity="0.3"
        />

        {/* Parcel 5 — South healthy strip */}
        <polygon
          points="60,480 280,440 360,460 380,560 300,600 100,620 50,570"
          fill="#1d6030"
        />
        <polygon
          points="60,480 280,440 360,460 380,560 300,600 100,620 50,570"
          fill="url(#fieldrows)"
          opacity="0.35"
        />

        {/* Parcel 6 — Southeast strip */}
        <polygon
          points="310,340 395,300 400,480 370,520 300,500 280,440 320,380"
          fill="#235c28"
        />

        {/* Parcel 7 — Bottom-left corner */}
        <polygon
          points="10,500 50,450 100,500 90,640 10,660"
          fill="#1a5220"
        />

        {/* ── Road/canal separators ── */}
        {/* Horizontal road */}
        <polygon
          points="0,430 400,410 400,450 0,470"
          fill="#0f1a0f"
          opacity="0.8"
        />
        {/* Vertical road */}
        <polygon
          points="155,0 185,0 190,700 160,700"
          fill="#0f1a0f"
          opacity="0.7"
        />
        {/* Diagonal canal */}
        <polygon
          points="300,150 330,145 340,300 310,305"
          fill="#0a1510"
          opacity="0.6"
        />

        {/* ── NDVI heat overlay — critical zone A3 (northeast, red/amber) ── */}
        <ellipse cx="303" cy="154" rx="55" ry="45" fill="rgba(185,28,28,0.50)" filter="url(#heatblur)" />
        <ellipse cx="303" cy="154" rx="35" ry="28" fill="rgba(220,38,38,0.55)" filter="url(#softblur)" />
        <ellipse cx="303" cy="154" rx="18" ry="14" fill="rgba(239,68,68,0.65)" />

        {/* ── NDVI heat overlay — zone B1 (southwest, amber) ── */}
        <ellipse cx="96" cy="476" rx="38" ry="30" fill="rgba(161,107,4,0.55)" filter="url(#heatblur)" />
        <ellipse cx="96" cy="476" rx="22" ry="18" fill="rgba(202,138,4,0.60)" filter="url(#softblur)" />

        {/* ── NDVI heat overlay — zone C2 (center, amber) ── */}
        <ellipse cx="224" cy="266" rx="45" ry="38" fill="rgba(130,95,10,0.50)" filter="url(#heatblur)" />
        <ellipse cx="224" cy="266" rx="28" ry="22" fill="rgba(180,130,15,0.55)" filter="url(#softblur)" />

        {/* ── Healthy patches — subtle green glow ── */}
        <ellipse cx="48" cy="100" rx="32" ry="26" fill="rgba(34,197,94,0.20)" filter="url(#softblur)" />
        <ellipse cx="348" cy="520" rx="28" ry="22" fill="rgba(34,197,94,0.18)" filter="url(#softblur)" />
        <ellipse cx="150" cy="560" rx="36" ry="28" fill="rgba(34,197,94,0.22)" filter="url(#softblur)" />

        {/* ── Scan-line satellite texture overlay ── */}
        <rect width="400" height="700" fill="url(#scanlines)" opacity="0.6" />

        {/* ── Subtle vignette ── */}
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="40%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
        </radialGradient>
        <rect width="400" height="700" fill="url(#vignette)" />
      </svg>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

      <motion.div
        className="absolute top-0 left-0 right-0 z-30 flex items-start justify-between px-5 pt-11"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] text-white/40 uppercase mb-0.5">Sentinel-2 · NDVI</p>
          <h2 className="text-[17px] font-semibold text-white leading-tight">Field Overview</h2>
        </div>
        <motion.div
          className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(185,28,28,0.25)', border: '1px solid rgba(239,68,68,0.35)' }}
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="text-[10px] font-semibold text-red-300 whitespace-nowrap">1 Alert</span>
        </motion.div>
      </motion.div>

      {/* ── Map pins ── */}
      {ZONE_PINS.map(({ zone, cx, cy }, i) => (
        <ZonePin
          key={zone.id}
          zone={zone}
          cx={cx}
          cy={cy}
          delay={0.4 + i * 0.2}
          isActive={active?.id === zone.id}
          onClick={() => handlePin(zone)}
        />
      ))}

      {/* ── NDVI scale bar ── */}
      <motion.div
        className="absolute bottom-28 right-4 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
      >
        <div className="glass px-3 py-2">
          <p className="text-[8px] font-bold tracking-widest text-white/35 uppercase mb-1.5">NDVI Index</p>
          <div className="h-1.5 w-28 rounded-full mb-1" style={{ background: 'linear-gradient(to right,#b91c1c,#ca8a04,#65a30d,#166534)' }} />
          <div className="flex justify-between w-28">
            <span className="text-[8px] text-white/35">Low</span>
            <span className="text-[8px] text-white/35">High</span>
          </div>
        </div>
      </motion.div>

      {/* ── Zone card ── */}
      <AnimatePresence>
        {(active || selectedZone) && (
          <ZoneCard
            zone={active ?? fieldZones[0]}
            onScanLeaf={() => onScanLeaf?.()}
          />
        )}
      </AnimatePresence>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
    </motion.div>
  );
}

// ── Pin component ──────────────────────────────────────────────────────────

interface PinProps {
  zone: FieldZone;
  cx: number; // % left
  cy: number; // % top
  delay: number;
  isActive: boolean;
  onClick: () => void;
}

const severityStyle = {
  low:      { dot: '#22c55e', ring: 'rgba(34,197,94,0.25)',  pill: 'rgba(34,197,94,0.18)',  border: 'rgba(34,197,94,0.4)',  text: '#86efac' },
  moderate: { dot: '#f59e0b', ring: 'rgba(245,158,11,0.25)', pill: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)', text: '#fde68a' },
  severe:   { dot: '#ef4444', ring: 'rgba(239,68,68,0.25)',  pill: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.4)',  text: '#fca5a5' },
};

function ZonePin({ zone, cx, cy, delay, isActive, onClick }: PinProps) {
  const s = severityStyle[zone.severity];

  return (
    <motion.button
      className="absolute z-20 flex flex-col items-center cursor-pointer"
      style={{ left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -100%)' }}
      initial={{ opacity: 0, scale: 0, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...springBouncy, delay }}
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
    >
      {/* Pulse ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 36, height: 36, top: -2, left: '50%', x: '-50%', border: `1.5px solid ${s.dot}` }}
        animate={zone.severity === 'severe'
          ? { scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }
          : { scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }
        }
        transition={{ duration: zone.severity === 'severe' ? 1.6 : 2.5, repeat: Infinity, ease: 'easeOut' }}
      />

      {/* Pill badge */}
      <motion.div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg mb-1"
        style={{
          background: isActive ? s.pill : 'rgba(0,0,0,0.55)',
          border: `1px solid ${isActive ? s.dot : s.border}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        animate={{ scale: isActive ? 1.08 : 1 }}
        transition={springDefault}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot, boxShadow: `0 0 5px ${s.dot}` }} />
        <span className="text-[11px] font-bold tabular-nums leading-none" style={{ color: s.text }}>
          {zone.ndviValue.toFixed(2)}
        </span>
      </motion.div>

      {/* Stem + anchor */}
      <div className="w-px h-3" style={{ backgroundColor: s.dot, opacity: 0.6 }} />
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
    </motion.button>
  );
}
