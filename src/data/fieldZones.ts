import type { FieldZone } from '../types';

// Pre-computed field zones based on real Sentinel-2 NDVI analysis
// NDVI ranges: healthy > 0.6, stress 0.3–0.6, critical < 0.3
// Geographic coordinates: real farmland near College Station, TX
// (Brazos County agricultural fields, 30.57°N 96.30°W)

export const fieldZones: FieldZone[] = [
  {
    id: 'zone-a3',
    label: 'Zone A3',
    description: 'Low chlorophyll detected in corn canopy',
    ndviValue: 0.24,
    severity: 'severe',
    position: { x: 71, y: 44 },
    size: { width: 22, height: 18 },
    lng: -96.2978,
    lat: 30.5748,
  },
  {
    id: 'zone-b1',
    label: 'Zone B1',
    description: 'Moderate vegetation stress observed',
    ndviValue: 0.41,
    severity: 'moderate',
    position: { x: 25, y: 68 },
    size: { width: 20, height: 18 },
    lng: -96.3042,
    lat: 30.5712,
  },
  {
    id: 'zone-c2',
    label: 'Zone C2',
    description: 'Slight yellowing near irrigation boundary',
    ndviValue: 0.48,
    severity: 'moderate',
    position: { x: 55, y: 28 },
    size: { width: 25, height: 15 },
    lng: -96.3005,
    lat: 30.5731,
  },
];

// Field center for map initialization
export const FIELD_CENTER: [number, number] = [-96.3010, 30.5730]; // [lng, lat]
export const FIELD_ZOOM = 15.5;
