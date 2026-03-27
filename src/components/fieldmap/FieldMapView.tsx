import { motion } from 'framer-motion';
import { springDefault } from '../../animations/springs';
import { blurFade } from '../../animations/variants';
import NDVIOverlay from './NDVIOverlay';
import HotspotMarker from './HotspotMarker';
import ZoneCard from './ZoneCard';
import { fieldZones } from '../../data/fieldZones';

interface Props {
  selectedZone?: boolean;
  onZoneSelect?: () => void;
  onScanLeaf?: () => void;
}

export default function FieldMapView({ selectedZone, onZoneSelect, onScanLeaf }: Props) {
  const criticalZone = fieldZones[0]; // The primary demo zone

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden"
      variants={blurFade}
      initial="hidden"
      animate={selectedZone ? { scale: 1.15, filter: 'blur(0px)', opacity: 1 } : 'visible'}
      exit={{ scale: 2, filter: 'blur(12px)', opacity: 0 }}
      transition={springDefault}
    >
      {/* Header */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-20 p-6 pt-14"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h2 className="text-lg font-semibold text-white">Field Overview</h2>
        <p className="text-sm text-white/50 mt-1">Satellite vegetation health analysis</p>
      </motion.div>

      {/* Satellite field image — using a CSS-generated field pattern as placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D5016] via-[#3A6B1E] to-[#1E4D0E]">
        {/* Simulated field rows pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(
              175deg,
              transparent,
              transparent 8px,
              rgba(0,0,0,0.15) 8px,
              rgba(0,0,0,0.15) 9px
            )`,
          }}
        />
      </div>

      {/* NDVI color overlay */}
      <NDVIOverlay />

      {/* Hotspot markers */}
      {fieldZones.map((zone, i) => (
        <HotspotMarker
          key={zone.id}
          zone={zone}
          delay={0.5 + i * 0.3}
          onClick={() => onZoneSelect?.()}
        />
      ))}

      {/* Zone info card (shown when a zone is selected) */}
      {selectedZone && (
        <ZoneCard zone={criticalZone} onScanLeaf={() => onScanLeaf?.()} />
      )}

      {/* Gradient overlay at bottom for readability */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A]/80 to-transparent" />
    </motion.div>
  );
}
