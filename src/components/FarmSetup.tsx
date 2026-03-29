import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Sprout, Ruler } from 'lucide-react';
import { springDefault } from '../animations/springs';
import { blurFade } from '../animations/variants';

const CROPS = ['Wheat', 'Corn', 'Tomato', 'Potato', 'Cotton', 'Alfalfa'];

interface Props {
  onComplete: () => void;
}

const STEPS = ['Location', 'Crop Type', 'Farm Size'];

const darkCardStyle = {
  background: 'rgba(8, 12, 8, 0.94)',
  border: '1px solid rgba(108,176,94,0.14)',
  borderRadius: 20,
  boxShadow: '0 18px 38px rgba(0,0,0,0.28)',
} satisfies React.CSSProperties;

const darkInputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '2px solid rgba(108,176,94,0.18)',
  color: '#FFFFFF',
} satisfies React.CSSProperties;

interface ToggleStyleProps {
  selected: boolean;
}

function getToggleStyle({ selected }: ToggleStyleProps): React.CSSProperties {
  return {
    background: selected ? '#2D5A27' : 'rgba(255,255,255,0.04)',
    color: '#FFFFFF',
    border: `1px solid ${selected ? 'rgba(158,216,142,0.3)' : 'rgba(108,176,94,0.14)'}`,
    boxShadow: selected ? '0 10px 24px rgba(45,90,39,0.24)' : 'none',
  };
}

export default function FarmSetup({ onComplete }: Props) {
  const [location, setLocation] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [farmSize, setFarmSize] = useState('');
  const [unit, setUnit] = useState<'acres' | 'hectares'>('acres');

  const step1Done = location.trim().length > 3;
  const step2Done = selectedCrops.length > 0;
  const step3Done = farmSize.trim().length > 0 && Number(farmSize) > 0;
  const allDone = step1Done && step2Done && step3Done;
  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };

  const toggleCrop = (crop: string) => {
    setSelectedCrops(prev =>
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  };

  return (
    <motion.div
      className="app-page"
      style={{ background: '#030603' }}
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
      transition={springDefault}
    >
      <div
        className="page-header"
        style={{
          background: 'rgba(14, 34, 12, 0.96)',
          borderBottom: '1px solid rgba(108,176,94,0.14)',
        }}
      >
        <p className="page-header-kicker" style={{ color: 'rgba(223,248,216,0.82)' }}>Field Intelligence</p>
        <h1 className="page-header-title">Initialize Field Scan</h1>
        <p className="page-header-copy" style={{ marginTop: 8, color: 'rgba(255,255,255,0.74)' }}>
          Enter your farm details to generate the field overview.
        </p>

        <div className="mt-5 flex items-center gap-2">
          {STEPS.map((label, i) => {
            const done = i < completedSteps;
            const active = i === completedSteps;

            return (
              <div key={label} className="flex flex-1 flex-col gap-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    background: done
                      ? '#9ED88E'
                      : active
                      ? 'rgba(158,216,142,0.55)'
                      : 'rgba(255,255,255,0.16)',
                  }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-[0.08em]"
                  style={{
                    color: done || active ? '#FFFFFF' : 'rgba(255,255,255,0.58)',
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="page-content flex-1" style={{ maxWidth: 760 }}>
        <div className="app-section">
          <motion.div
            className="p-5"
            style={darkCardStyle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.1 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="app-icon-box"
                style={{ background: 'rgba(45,90,39,0.25)', color: '#DFF8D8' }}
              >
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <p className="app-label" style={{ color: '#FFFFFF' }}>Farm Location</p>
                <p className="section-label" style={{ color: 'rgba(255,255,255,0.58)' }}>Address or coordinates</p>
              </div>
              {step1Done && (
                <span
                  className="app-chip"
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(158,216,142,0.12)',
                    border: '1px solid rgba(158,216,142,0.18)',
                    color: '#DFF8D8',
                  }}
                >
                  Set
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Address or coordinates"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="app-input"
                style={darkInputStyle}
                autoComplete="street-address"
              />
              <motion.button
                type="button"
                onClick={handleGPS}
                disabled={gpsLoading}
                className="app-button-primary"
                style={{ padding: '14px 18px', whiteSpace: 'nowrap', background: '#2D5A27' }}
                whileTap={{ scale: 0.97 }}
              >
                <Navigation size={16} />
                {gpsLoading ? '...' : 'GPS'}
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            className="p-5"
            style={darkCardStyle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.18 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="app-icon-box"
                style={{ background: 'rgba(45,90,39,0.25)', color: '#DFF8D8' }}
              >
                <Sprout size={18} />
              </div>
              <div className="flex-1">
                <p className="app-label" style={{ color: '#FFFFFF' }}>Crop Type</p>
                <p className="section-label" style={{ color: 'rgba(255,255,255,0.58)' }}>Select one or more crops</p>
              </div>
              {step2Done && (
                <span
                  className="app-chip"
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(158,216,142,0.12)',
                    border: '1px solid rgba(158,216,142,0.18)',
                    color: '#DFF8D8',
                  }}
                >
                  {selectedCrops.length} selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {CROPS.map(crop => {
                const selected = selectedCrops.includes(crop);

                return (
                  <motion.button
                    key={crop}
                    type="button"
                    onClick={() => toggleCrop(crop)}
                    className="app-button-secondary"
                    style={{
                      ...getToggleStyle({ selected }),
                      padding: '12px 16px',
                      borderRadius: 999,
                      minWidth: 'calc(50% - 6px)',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {crop}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            className="p-5"
            style={darkCardStyle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.26 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="app-icon-box"
                style={{ background: 'rgba(45,90,39,0.25)', color: '#DFF8D8' }}
              >
                <Ruler size={18} />
              </div>
              <div className="flex-1">
                <p className="app-label" style={{ color: '#FFFFFF' }}>Farm Size</p>
                <p className="section-label" style={{ color: 'rgba(255,255,255,0.58)' }}>Enter the total area</p>
              </div>
              {step3Done && (
                <span
                  className="app-chip"
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(158,216,142,0.12)',
                    border: '1px solid rgba(158,216,142,0.18)',
                    color: '#DFF8D8',
                  }}
                >
                  Set
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="number"
                placeholder="e.g. 120"
                min="0.1"
                step="0.1"
                value={farmSize}
                onChange={e => setFarmSize(e.target.value)}
                className="app-input"
                style={darkInputStyle}
              />
              <div
                className="flex rounded-xl p-1"
                style={{ border: '1px solid rgba(108,176,94,0.16)', background: 'rgba(255,255,255,0.04)' }}
              >
                {(['acres', 'hectares'] as const).map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className="app-button-secondary"
                    style={{
                      ...getToggleStyle({ selected: unit === u }),
                      padding: '12px 14px',
                      borderRadius: 8,
                      fontSize: 14,
                      minWidth: 56,
                    }}
                  >
                    {u === 'acres' ? 'ac' : 'ha'}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={springDefault}
                className="p-4"
                style={darkCardStyle}
              >
                <p className="section-label" style={{ color: '#A9DDA0' }}>Ready To Generate</p>
                <p className="app-text" style={{ marginTop: 8, color: '#FFFFFF' }}>
                  {selectedCrops.join(' • ')} • {farmSize} {unit}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={allDone ? onComplete : undefined}
            disabled={!allDone}
            className="app-button-primary app-button-cta"
            style={{
              background: allDone ? '#2D5A27' : 'rgba(45,90,39,0.5)',
              border: '1px solid rgba(158,216,142,0.22)',
            }}
            whileTap={allDone ? { scale: 0.98 } : {}}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.35 }}
          >
            Generate Spectral Map
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
