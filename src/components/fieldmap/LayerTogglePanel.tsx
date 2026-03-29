import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';
import type { LayerDef } from '../../hooks/useLayerImages';

interface Props {
  layers: LayerDef[];
  activeLayerId: string | null;
  layerAvailability: Record<string, boolean>;
  onLayerChange: (id: string | null) => void;
}

const GROUPS = ['Imagery', 'Field Health', 'Priority Zones'];

export default function LayerTogglePanel({ layers, activeLayerId, layerAvailability, onLayerChange }: Props) {
  const [open, setOpen] = useState(false);

  const grouped = GROUPS.map(group => ({
    group,
    items: layers.filter(l => l.group === group),
  }));

  return (
    <div className="absolute bottom-28 right-4 z-20 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="app-card overflow-hidden"
            style={{ minWidth: '240px' }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}>
              <div className="flex items-center gap-2">
                <Layers size={16} style={{ color: '#2D5A27' }} />
                <span className="app-label">Layers</span>
              </div>
              <button onClick={() => setOpen(false)} className="app-button-secondary" style={{ width: 40, height: 40, padding: 0, borderRadius: '999px' }}>
                <X size={14} />
              </button>
            </div>

            {grouped.map(({ group, items }, gi) => (
              <div key={group}>
                {gi > 0 && <div className="app-divider mx-3" />}
                <div className="px-4 py-3">
                  <p className="section-label mb-2">{group}</p>
                  <div className="flex flex-col gap-2">
                    {items.map(layer => {
                      const available = layerAvailability[layer.id] !== false;
                      const isActive = activeLayerId === layer.id;
                      return (
                        <button
                          key={layer.id}
                          disabled={!available}
                          onClick={() => onLayerChange(layer.id)}
                          className={`flex items-center gap-2.5 w-full text-left py-1 transition-opacity ${!available ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors"
                            style={{
                              background: isActive ? '#2D5A27' : '#FFFFFF',
                              borderColor: '#2D5A27',
                            }}
                          >
                            {isActive && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="text-sm font-semibold leading-tight" style={{ color: '#111111' }}>
                            {layer.label}
                          </span>
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
        onClick={() => setOpen(v => !v)}
        className={open ? 'app-button-secondary' : 'app-button-primary'}
      >
        <Layers size={14} />
        Layers
      </button>
    </div>
  );
}
