import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';

interface LayerDef {
  id: string;
  filename: string;
  label: string;
  description: string;
  group: string;
}

const LAYERS: LayerDef[] = [
  { id: 'rgb', filename: '1-rgb.png', label: 'True Color (RGB)', description: 'Satellite true-color composite', group: 'Imagery' },
  { id: 'veg-health', filename: '2-vegetation-health.png', label: 'Vegetation Health', description: 'NDVI heatmap with field health classification', group: 'Imagery' },
  { id: 'high-fields', filename: '3-high-fields.png', label: 'High / Healthy Fields', description: 'Fields with NDVI > 0.55', group: 'Field Health' },
  { id: 'medium-fields', filename: '4-medium-fields.png', label: 'Medium Fields', description: 'Fields with NDVI 0.35 – 0.55', group: 'Field Health' },
  { id: 'low-fields', filename: '5-low-fields.png', label: 'Low / Critical Fields', description: 'Fields with NDVI < 0.35', group: 'Field Health' },
  { id: 'priority-red', filename: '6-priority-red.png', label: 'RED Priority', description: 'Must visit — critical stress detected', group: 'Priority' },
  { id: 'priority-yellow', filename: '7-priority-yellow.png', label: 'YELLOW Priority', description: 'Monitor closely — moderate stress', group: 'Priority' },
];

const GROUPS = ['Imagery', 'Field Health', 'Priority'];

interface Props {
  farmAddress: string;
  farmSize: string;
  onScanLeaf?: () => void;
}

export default function LayerView({ farmAddress, farmSize, onScanLeaf }: Props) {
  const [activeId, setActiveId] = useState('rgb');
  const [panelOpen, setPanelOpen] = useState(true);

  const activeLayer = LAYERS.find(l => l.id === activeId) ?? LAYERS[0];
  const activeIdx = LAYERS.findIndex(l => l.id === activeId);

  const prev = () => setActiveId(LAYERS[(activeIdx - 1 + LAYERS.length) % LAYERS.length].id);
  const next = () => setActiveId(LAYERS[(activeIdx + 1) % LAYERS.length].id);

  const grouped = GROUPS.map(group => ({
    group,
    items: LAYERS.filter(l => l.group === group),
  }));

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
        <div className="page-content !px-0 !py-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="page-header-kicker">Satellite Analysis</p>
              <h2 className="page-header-title">{activeLayer.label}</h2>
              <p className="page-header-copy" style={{ marginTop: 8 }}>{activeLayer.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white truncate max-w-[160px]">{farmAddress.split(',')[0]}</p>
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.82)' }}>{farmSize} acres</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content flex-1 w-full">
        <div className="relative h-full min-h-[420px] app-card overflow-hidden p-4">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeId}
              src={`/layers/${activeLayer.filename}`}
              alt={activeLayer.label}
              className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] object-contain rounded-xl"
              style={{ background: '#F5F5F5' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>

          <button
            onClick={prev}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 app-button-secondary"
            style={{ width: 48, height: 48, padding: 0, borderRadius: '999px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 app-button-secondary"
            style={{ width: 48, height: 48, padding: 0, borderRadius: '999px' }}
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {LAYERS.map(l => (
              <button
                key={l.id}
                onClick={() => setActiveId(l.id)}
                className="rounded-full transition-all"
                style={{
                  width: l.id === activeId ? '22px' : '8px',
                  height: '8px',
                  background: l.id === activeId ? '#2D5A27' : 'rgba(17,17,17,0.18)',
                }}
              />
            ))}
          </div>

          <div className="absolute bottom-20 right-4 z-30 flex flex-col items-end gap-2">
            <AnimatePresence>
              {panelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="app-card overflow-hidden"
                  style={{ minWidth: '280px' }}
                >
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}>
                    <div className="flex items-center gap-2">
                      <Layers size={16} style={{ color: '#2D5A27' }} />
                      <span className="app-label">Layers</span>
                    </div>
                    <button onClick={() => setPanelOpen(false)} className="app-button-secondary" style={{ width: 40, height: 40, padding: 0, borderRadius: '999px' }}>
                      <X size={16} />
                    </button>
                  </div>

                  {grouped.map(({ group, items }, gi) => (
                    <div key={group}>
                      {gi > 0 && <div className="app-divider mx-4" />}
                      <div className="px-4 py-3">
                        <p className="section-label mb-2">{group}</p>
                        <div className="flex flex-col gap-2">
                          {items.map(layer => {
                            const isActive = activeId === layer.id;
                            return (
                              <button
                                key={layer.id}
                                onClick={() => setActiveId(layer.id)}
                                className="flex items-center gap-3 w-full text-left py-1"
                              >
                                <span
                                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors"
                                  style={{
                                    background: isActive ? '#2D5A27' : '#FFFFFF',
                                    borderColor: '#2D5A27',
                                  }}
                                >
                                  {isActive && (
                                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                      <path d="M1 4.5l3 3L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>
                                <div>
                                  <p className="text-sm font-bold leading-tight" style={{ color: '#111111' }}>
                                    {layer.label}
                                  </p>
                                  <p className="text-sm font-semibold leading-tight" style={{ color: '#444444' }}>
                                    {layer.description}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setPanelOpen(v => !v)}
              className={panelOpen ? 'app-button-secondary' : 'app-button-primary'}
            >
              <Layers size={16} />
              Layers
            </button>
          </div>
        </div>
      </div>

      <div className="page-content pt-0 pb-6">
        <div className="app-card p-5">
          <div className="flex items-end gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#00CC00' }} />
                <span className="text-sm font-semibold" style={{ color: '#444444' }}>Healthy &gt; 0.55</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#FFFF00' }} />
                <span className="text-sm font-semibold" style={{ color: '#444444' }}>Moderate 0.35 – 0.55</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#FF0000' }} />
                <span className="text-sm font-semibold" style={{ color: '#444444' }}>Critical &lt; 0.35</span>
              </div>
            </div>

            {onScanLeaf && (
              <motion.button
                onClick={onScanLeaf}
                className="app-button-primary app-button-cta"
                style={{ width: 'auto', flex: 1 }}
                whileTap={{ scale: 0.98 }}
              >
                <Camera size={18} />
                Scan a Leaf
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
