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
            style={{
              background: 'rgba(255,255,255,0.97)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              borderRadius: '12px',
              minWidth: '220px',
            }}
            className="overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-gray-600" />
                <span className="text-[13px] font-semibold text-gray-800">Layers</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Groups */}
            {grouped.map(({ group, items }, gi) => (
              <div key={group}>
                {gi > 0 && <div className="h-px bg-gray-100 mx-3" />}
                <div className="px-3.5 py-2">
                  <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-1.5">{group}</p>
                  <div className="flex flex-col gap-1">
                    {items.map(layer => {
                      const available = layerAvailability[layer.id] !== false;
                      const isActive = activeLayerId === layer.id;
                      return (
                        <button
                          key={layer.id}
                          disabled={!available}
                          onClick={() => onLayerChange(layer.id)}
                          className={`flex items-center gap-2.5 w-full text-left py-0.5 transition-opacity ${!available ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {/* Custom checkbox */}
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors"
                            style={{
                              background: isActive ? '#16a34a' : 'white',
                              borderColor: isActive ? '#16a34a' : '#d1d5db',
                            }}
                          >
                            {isActive && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className={`text-[12px] leading-tight ${isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
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

      {/* Toggle pill */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
        style={{
          background: open ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.85)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          color: '#1a1a1a',
        }}
      >
        <Layers size={12} />
        Layers
      </button>
    </div>
  );
}
