// RGB to HSV conversion
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, v };
}

// Map a normalized value (0–1) to a heatmap color ramp
// deep blue → cyan → green → yellow → red
export function valueToHeatmapColor(value: number): { r: number; g: number; b: number } {
  // Clamp to [0, 1]
  const t = Math.max(0, Math.min(1, value));

  // 5-stop color ramp
  const stops = [
    { t: 0.0, r: 239, g: 68, b: 68 },   // red (#EF4444) — severely deficient
    { t: 0.25, r: 234, g: 179, b: 8 },   // yellow (#EAB308)
    { t: 0.5, r: 34, g: 197, b: 94 },    // green (#22C55E)
    { t: 0.75, r: 6, g: 182, b: 212 },   // cyan (#06B6D4)
    { t: 1.0, r: 30, g: 58, b: 138 },    // deep blue (#1E3A8A) — healthy
  ];

  // Find the two stops to interpolate between
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper.t - lower.t;
  const factor = range === 0 ? 0 : (t - lower.t) / range;

  return {
    r: Math.round(lower.r + (upper.r - lower.r) * factor),
    g: Math.round(lower.g + (upper.g - lower.g) * factor),
    b: Math.round(lower.b + (upper.b - lower.b) * factor),
  };
}
