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
  { id: 'rgb',             filename: '1-rgb.png',                label: 'True Color (RGB)',          description: 'Satellite true-color composite',         group: 'Imagery' },
  { id: 'veg-health',      filename: '2-vegetation-health.png',  label: 'Vegetation Health',         description: 'NDVI heatmap — red=stressed, green=healthy', group: 'Imagery' },
  { id: 'high-fields',     filename: '3-high-fields.png',        label: 'High / Healthy Fields',     description: 'Fields with NDVI > 0.55',                group: 'Field Health' },
  { id: 'medium-fields',   filename: '4-medium-fields.png',      label: 'Medium Fields',             description: 'Fields with NDVI 0.35 – 0.55',           group: 'Field Health' },
  { id: 'low-fields',      filename: '5-low-fields.png',         label: 'Low / Critical Fields',     description: 'Fields with NDVI < 0.35',                group: 'Field Health' },
  { id: 'priority-red',    filename: '6-priority-red.png',       label: 'RED Priority',              description: 'Must visit — critical stress detected',  group: 'Priority' },
  { id: 'priority-yellow', filename: '7-priority-yellow.png',    label: 'YELLOW Priority',           description: 'Monitor closely — moderate stress',      group: 'Priority' },
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
      className="absolute inset-0 flex flex-col"
      style={{ background: '#080c08' }}
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
      transition={springDefault}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-10 pb-3 shrink-0 z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(8,12,8,0.95), transparent)' }}
      >
        <div>
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Satellite Analysis</p>
          <h2 className="text-[16px] font-semibold text-white leading-tight">{activeLayer.label}</h2>
          <p className="text-[11px] text-white/35 mt-0.5">{activeLayer.description}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/30 truncate max-w-[120px]">{farmAddress.split(',')[0]}</p>
          <p className="text-[10px] text-white/20">{farmSize} acres</p>
        </div>
      </div>

      {/* Image area — fills remaining space */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeId}
            src={`/layers/${activeLayer.filename}`}
            alt={activeLayer.label}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ background: '#080c08' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        </AnimatePresence>

        {/* Prev / Next arrows */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <ChevronLeft size={18} className="text-white/70" />
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <ChevronRight size={18} className="text-white/70" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {LAYERS.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveId(l.id)}
              className="rounded-full transition-all"
              style={{
                width: l.id === activeId ? '18px' : '6px',
                height: '6px',
                background: l.id === activeId ? '#4ade80' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>

        {/* Layers toggle panel — bottom right, larger */}
        <div className="absolute bottom-16 right-4 z-30 flex flex-col items-end gap-2">
          <AnimatePresence>
            {panelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                style={{
                  background: 'rgba(255,255,255,0.97)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  borderRadius: '16px',
                  minWidth: '260px',
                }}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-gray-600" />
                    <span className="text-[14px] font-bold text-gray-800">Layers</span>
                  </div>
                  <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

                {/* Groups */}
                {grouped.map(({ group, items }, gi) => (
                  <div key={group}>
                    {gi > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <div className="px-4 py-3">
                      <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-2">{group}</p>
                      <div className="flex flex-col gap-2">
                        {items.map(layer => {
                          const isActive = activeId === layer.id;
                          return (
                            <button
                              key={layer.id}
                              onClick={() => setActiveId(layer.id)}
                              className="flex items-center gap-3 w-full text-left py-0.5"
                            >
                              <span
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors"
                                style={{
                                  background: isActive ? '#16a34a' : 'white',
                                  borderColor: isActive ? '#16a34a' : '#d1d5db',
                                }}
                              >
                                {isActive && (
                                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                    <path d="M1 4.5l3 3L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                              <div>
                                <p className={`text-[13px] leading-tight ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                                  {layer.label}
                                </p>
                                <p className="text-[10px] text-gray-400 leading-tight">{layer.description}</p>
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

          {/* Toggle button */}
          <button
            onClick={() => setPanelOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors"
            style={{
              background: panelOpen ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.9)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              color: '#1a1a1a',
              minWidth: '100px',
            }}
          >
            <Layers size={15} />
            Layers
          </button>
        </div>
      </div>

      {/* Bottom bar — legend + scan CTA */}
      <div
        className="shrink-0 px-5 pb-8 pt-3 z-10 flex items-end gap-3"
        style={{ background: 'linear-gradient(to top, rgba(8,12,8,1) 60%, transparent)' }}
      >
        {/* Legend */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#00CC00' }} />
            <span className="text-[10px] text-white/40">Healthy &gt; 0.55</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#FFFF00' }} />
            <span className="text-[10px] text-white/40">Moderate 0.35 – 0.55</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#FF0000' }} />
            <span className="text-[10px] text-white/40">Critical &lt; 0.35</span>
          </div>
        </div>

        {/* Scan CTA */}
        {onScanLeaf && (
          <motion.button
            onClick={onScanLeaf}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-[14px] text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              boxShadow: '0 4px 20px rgba(22,163,74,0.35)',
            }}
            whileTap={{ scale: 0.96 }}
          >
            <Camera size={16} />
            Scan a Leaf
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
