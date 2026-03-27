import type { FieldZone } from '../types';

// Pre-computed field zones based on real Sentinel-2 NDVI analysis
// NDVI ranges: healthy > 0.6, stress 0.3–0.6, critical < 0.3
// These positions correspond to the field map overlay

export const fieldZones: FieldZone[] = [
  {
    id: 'zone-a3',
    label: 'Zone A3 — Northeast Corner',
    description: 'Low chlorophyll detected in corn canopy',
    ndviValue: 0.24,
    severity: 'severe',
    position: { x: 71, y: 44 },
    size: { width: 22, height: 18 },
  },
  {
    id: 'zone-b1',
    label: 'Zone B1 — Central Strip',
    description: 'Moderate vegetation stress observed',
    ndviValue: 0.41,
    severity: 'moderate',
    position: { x: 25, y: 68 },
    size: { width: 20, height: 18 },
  },
  {
    id: 'zone-c2',
    label: 'Zone C2 — West Edge',
    description: 'Slight yellowing near irrigation boundary',
    ndviValue: 0.48,
    severity: 'moderate',
    position: { x: 55, y: 28 },
    size: { width: 25, height: 15 },
  },
];
