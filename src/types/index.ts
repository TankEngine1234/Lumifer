// ── Demo Phase State Machine ──
export type DemoPhase =
  | 'splash'
  | 'fieldmap'
  | 'zone'
  | 'capture'
  | 'lock'
  | 'captured'
  | 'analyzing'
  | 'heatmap'
  | 'results'
  | 'context';

// ── NASA POWER API ──
export interface NASAPowerDaily {
  T2M_MAX: Record<string, number>;
  T2M_MIN: Record<string, number>;
  PRECTOTCORR: Record<string, number>;
  RH2M: Record<string, number>;
  ALLSKY_SFC_PAR_TOT: Record<string, number>;
}

export type NASAFetchStatus = 'idle' | 'loading' | 'success' | 'error' | 'offline';

export interface StressEvent {
  type: 'heat' | 'drought' | 'humidity';
  startDate: string;
  endDate: string;
  durationDays: number;
  peakValue: number;
}

export interface NASAClimateResult {
  status: NASAFetchStatus;
  daily: NASAPowerDaily | null;
  stressEvents: StressEvent[];
  heatDays: number;
  droughtGap: number;
  lowHumidityDays: number;
}

// ── Nutrient Types ──
export type NutrientType = 'nitrogen' | 'phosphorus' | 'potassium';
export type DeficiencyLevel = 'deficient' | 'adequate' | 'optimal';
export type SeverityLevel = 'low' | 'moderate' | 'severe';

export interface NutrientReading {
  confidence: number; // 0–1
  level: DeficiencyLevel;
}

export interface NPKResult {
  nitrogen: NutrientReading;
  phosphorus: NutrientReading;
  potassium: NutrientReading;
  severity: SeverityLevel;
  yieldImpact: number; // estimated % yield loss (0–45)
}

// ── Vegetation Indices ──
export interface VegetationIndices {
  exg: number;   // Excess Green Index
  ngrdi: number; // Normalized Green-Red Difference Index
  vari: number;  // Visible Atmospherically Resistant Index
}

export interface ColorData {
  meanRGB: { r: number; g: number; b: number };
  meanHSV: { h: number; s: number; v: number };
}

export interface ProcessingResult {
  tensor: unknown; // tf.Tensor4D at runtime
  indices: VegetationIndices;
  colorData: ColorData;
  segmentedImageData: ImageData;
  originalImageData: ImageData;
  leafMask: ImageData;
}

// ── Field Map ──
export interface FieldZone {
  id: string;
  label: string;
  description: string;
  ndviValue: number;
  severity: SeverityLevel;
  position: { x: number; y: number }; // % position on field image
  size: { width: number; height: number }; // % size
  lng: number; // geographic longitude
  lat: number; // geographic latitude
}

// Rectangular field polygon from GEE segmentation
export interface FieldPolygon {
  id: string;
  meanNdvi: number;
  geeLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  severity: SeverityLevel;
  areaHa: number;
  priority: number;
  bounds: [number, number, number, number]; // [west, south, east, north]
}

// ── Dataset Types ──
export interface LeafSample {
  id: string;
  imagePath: string;
  source: 'plantvillage' | 'field-capture';
  crop: string;
  rgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  indices: VegetationIndices;
  labels: {
    nitrogen: NutrientReading;
    phosphorus: NutrientReading;
    potassium: NutrientReading;
  };
  severity: SeverityLevel;
  yieldImpact: number;
  citation: string;
}

// ── Action Plan ──
export interface ActionPlan {
  id: string;
  nutrient: NutrientType;
  severity: SeverityLevel;
  title: string;
  description: string;
  rate: string; // e.g., "150 kg/ha"
  timing: string;
  icon: string; // lucide icon name
}

// ── Spectral Reference ──
export interface SpectralBand {
  wavelength: number; // nm
  name: string;
  absorptionPeak: boolean;
  correlatedIndex: string;
}
