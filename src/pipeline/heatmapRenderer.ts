// Spectral heatmap renderer
// Maps per-pixel vegetation index (NGRDI-like) to a false-color ramp:
//   <0.0  → red    (#EF4444) — severely deficient
//   0.0–0.2 → yellow (#EAB308)
//   0.2–0.4 → green  (#22C55E)
//   0.4–0.6 → cyan   (#06B6D4)
//   0.6+   → blue   (#1E3A8A) — healthy
//
// Only leaf pixels (inside the mask) are colorized. Background stays black.
// Returns a data URL string suitable for use as an <img> src.

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

type RGB = [number, number, number];

const RAMP: { threshold: number; color: RGB }[] = [
  { threshold: -1.0, color: [239, 68,  68]  },  // red
  { threshold:  0.0, color: [234, 179,  8]  },  // yellow
  { threshold:  0.2, color: [ 34, 197, 94]  },  // green
  { threshold:  0.4, color: [  6, 182, 212] },  // cyan
  { threshold:  0.6, color: [ 30,  58, 138] },  // blue
];

function indexToColor(ndvi: number): RGB {
  // Find bracket in ramp
  for (let i = 1; i < RAMP.length; i++) {
    if (ndvi <= RAMP[i].threshold) {
      const lo = RAMP[i - 1];
      const hi = RAMP[i];
      const t = (ndvi - lo.threshold) / (hi.threshold - lo.threshold);
      return [
        Math.round(lerp(lo.color[0], hi.color[0], t)),
        Math.round(lerp(lo.color[1], hi.color[1], t)),
        Math.round(lerp(lo.color[2], hi.color[2], t)),
      ];
    }
  }
  return RAMP[RAMP.length - 1].color;
}

export function renderHeatmapToCanvas(
  originalImageData: ImageData,
  leafMask: ImageData | null,
): string {
  const { width, height, data } = originalImageData;
  const maskData = leafMask?.data ?? null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const output = ctx.createImageData(width, height);
  const outData = output.data;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;

    // If outside the leaf mask, keep pixel dark/transparent
    const inMask = !maskData || (maskData[idx + 3] > 0 && maskData[idx] > 0);

    if (!inMask) {
      outData[idx]     = 0;
      outData[idx + 1] = 0;
      outData[idx + 2] = 0;
      outData[idx + 3] = 180; // semi-transparent black for background
      continue;
    }

    const R = data[idx];
    const G = data[idx + 1];

    // Per-pixel NGRDI: (G - R) / (G + R + 1)  — +1 avoids divide-by-zero
    const ndvi = (G - R) / (G + R + 1);
    const [r, g, b] = indexToColor(ndvi);

    outData[idx]     = r;
    outData[idx + 1] = g;
    outData[idx + 2] = b;
    outData[idx + 3] = 230; // slight transparency to let original bleed through
  }

  ctx.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
}
