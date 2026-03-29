import { useState, useEffect, useCallback } from 'react';

export interface LayerDef {
  id: string;
  filename: string;
  label: string;
  group: string;
}

const LAYERS: LayerDef[] = [
  { id: 'rgb',             filename: '1-rgb.png',                label: 'True Color (RGB)',          group: 'Imagery' },
  { id: 'veg-health',      filename: '2-vegetation-health.png',  label: 'Vegetation Health (NDVI)',   group: 'Imagery' },
  { id: 'high-fields',     filename: '3-high-fields.png',        label: 'High / Healthy Fields',     group: 'Field Health' },
  { id: 'medium-fields',   filename: '4-medium-fields.png',      label: 'Medium Fields',             group: 'Field Health' },
  { id: 'low-fields',      filename: '5-low-fields.png',         label: 'Low / Critical Fields',     group: 'Field Health' },
  { id: 'priority-red',    filename: '6-priority-red.png',       label: 'RED Priority (Must Visit)', group: 'Priority Zones' },
  { id: 'priority-yellow', filename: '7-priority-yellow.png',    label: 'YELLOW Priority (Monitor)', group: 'Priority Zones' },
];

export interface UseLayerImagesReturn {
  layers: LayerDef[];
  activeLayerId: string | null;
  layerAvailability: Record<string, boolean>;
  setActiveLayer: (id: string | null) => void;
}

export function useLayerImages(): UseLayerImagesReturn {
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [layerAvailability, setLayerAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checks = LAYERS.map(async (layer) => {
      try {
        const res = await fetch(`/layers/${layer.filename}`, { method: 'HEAD' });
        return { id: layer.id, available: res.ok };
      } catch {
        return { id: layer.id, available: false };
      }
    });

    Promise.all(checks).then((results) => {
      const availability: Record<string, boolean> = {};
      results.forEach(({ id, available }) => { availability[id] = available; });
      setLayerAvailability(availability);
    });
  }, []);

  const setActiveLayer = useCallback((id: string | null) => {
    setActiveLayerId(prev => (prev === id ? null : id));
  }, []);

  return { layers: LAYERS, activeLayerId, layerAvailability, setActiveLayer };
}
