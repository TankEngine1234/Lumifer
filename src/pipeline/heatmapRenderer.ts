import { valueToHeatmapColor } from '../utils/colorMath';

// Render a false-color spectral heatmap from leaf image data
// Per-pixel NDVI-like index: (G - R) / (G + R + 1) mapped to color ramp
// Only renders pixels inside the leaf mask

export function renderHeatmap(
  originalImageData: ImageData,
  leafMask: ImageData,
): ImageData {
  const { width, height, data: srcData } = originalImageData;
  const maskData = leafMask.data;

  const output = new ImageData(width, height);
  const outData = output.data;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;

    // Check if pixel is inside leaf mask (alpha > 0 or value > 0)
    const maskVal = maskData[idx] || maskData[idx + 3];
    if (maskVal === 0) {
      // Outside mask: transparent
      outData[idx] = 0;
      outData[idx + 1] = 0;
      outData[idx + 2] = 0;
      outData[idx + 3] = 0;
      continue;
    }

    const r = srcData[idx] / 255;
    const g = srcData[idx + 1] / 255;
    const b = srcData[idx + 2] / 255;

    // Compute ExG-based index from visible bands (Woebbecke et al., 1995)
    // ExG = 2G - R - B, range approximately [-2, 2], normalized to [0, 1]
    const index = (2 * g - r - b) / 2;
    const normalized = (index + 1) / 2; // Map [-1, 1] → [0, 1]

    const color = valueToHeatmapColor(normalized);

    outData[idx] = color.r;
    outData[idx + 1] = color.g;
    outData[idx + 2] = color.b;
    outData[idx + 3] = 200; // Semi-transparent
  }

  return output;
}

// Render heatmap to a canvas element and return as data URL
export function renderHeatmapToCanvas(
  originalImageData: ImageData,
  leafMask: ImageData,
): string {
  const heatmapData = renderHeatmap(originalImageData, leafMask);

  const canvas = document.createElement('canvas');
  canvas.width = heatmapData.width;
  canvas.height = heatmapData.height;

  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(heatmapData, 0, 0);

  return canvas.toDataURL('image/png');
}
