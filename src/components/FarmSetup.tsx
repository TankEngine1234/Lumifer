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
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
      transition={springDefault}
    >
      <div className="page-header">
        <p className="page-header-kicker">Field Intelligence</p>
        <h1 className="page-header-title">Initialize Field Scan</h1>
        <p className="page-header-copy" style={{ marginTop: 8 }}>
          Enter your farm details to generate the field overview.
        </p>

        <div className="mt-5 flex items-center gap-2">
          {STEPS.map((label, i) => {
            const done = i < completedSteps;
            const active = i === completedSteps;

            return (
              <div key={label} className="flex-1 flex flex-col gap-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    background: done
                      ? '#FFFFFF'
                      : active
                      ? 'rgba(255,255,255,0.55)'
                      : 'rgba(255,255,255,0.22)',
                  }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-[0.08em]"
                  style={{
                    color: done || active ? '#FFFFFF' : 'rgba(255,255,255,0.68)',
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="page-content flex-1">
        <div className="app-section">
          <motion.div
            className="app-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="app-icon-box">
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <p className="app-label">Farm Location</p>
                <p className="section-label">Address or coordinates</p>
              </div>
              {step1Done && (
                <span className="app-chip" style={{ padding: '8px 12px' }}>
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
                autoComplete="street-address"
              />
              <motion.button
                type="button"
                onClick={handleGPS}
                disabled={gpsLoading}
                className="app-button-primary"
                style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}
                whileTap={{ scale: 0.97 }}
              >
                <Navigation size={16} />
                {gpsLoading ? '...' : 'GPS'}
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            className="app-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.18 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="app-icon-box">
                <Sprout size={18} />
              </div>
              <div className="flex-1">
                <p className="app-label">Crop Type</p>
                <p className="section-label">Select one or more crops</p>
              </div>
              {step2Done && (
                <span className="app-chip" style={{ padding: '8px 12px' }}>
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
                    className={selected ? 'app-button-primary' : 'app-button-secondary'}
                    style={{
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
            className="app-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.26 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="app-icon-box">
                <Ruler size={18} />
              </div>
              <div className="flex-1">
                <p className="app-label">Farm Size</p>
                <p className="section-label">Enter the total area</p>
              </div>
              {step3Done && (
                <span className="app-chip" style={{ padding: '8px 12px' }}>
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
              />
              <div className="flex rounded-xl border-2 p-1" style={{ borderColor: '#2D5A27', background: '#FFFFFF' }}>
                {(['acres', 'hectares'] as const).map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={unit === u ? 'app-button-primary' : 'app-button-secondary'}
                    style={{
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
                className="app-card p-4"
              >
                <p className="section-label">Ready To Generate</p>
                <p className="app-text" style={{ marginTop: 8 }}>
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
