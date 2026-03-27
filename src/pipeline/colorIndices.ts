import type { VegetationIndices, ColorData } from '../types';
import { rgbToHsv } from '../utils/colorMath';

// Compute vegetation indices and color statistics from leaf pixel data
// Indices are based on published formulas:
//   ExG:   Woebbecke et al. (1995) - 2G - R - B
//   NGRDI: Tucker (1979) - (G-R)/(G+R)
//   VARI:  Gitelson et al. (2002) - (G-R)/(G+R-B)

export function computeColorIndices(imageData: ImageData, mask?: ImageData): { indices: VegetationIndices; colorData: ColorData } {
  const { data, width, height } = imageData;
  const maskData = mask?.data;

  let totalR = 0, totalG = 0, totalB = 0;
  let totalExg = 0, totalNgrdi = 0, totalVari = 0;
  let pixelCount = 0;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;

    // Skip pixels outside the mask
    if (maskData && maskData[idx + 3] === 0) continue;

    const r = data[idx] / 255;
    const g = data[idx + 1] / 255;
    const b = data[idx + 2] / 255;

    totalR += r;
    totalG += g;
    totalB += b;

    // Excess Green Index: 2G - R - B
    totalExg += 2 * g - r - b;

    // Normalized Green-Red Difference Index: (G - R) / (G + R)
    const grSum = g + r;
    totalNgrdi += grSum > 0 ? (g - r) / grSum : 0;

    // Visible Atmospherically Resistant Index: (G - R) / (G + R - B)
    const grbDenom = g + r - b;
    totalVari += Math.abs(grbDenom) > 0.001 ? (g - r) / grbDenom : 0;

    pixelCount++;
  }

  if (pixelCount === 0) {
    return {
      indices: { exg: 0, ngrdi: 0, vari: 0 },
      colorData: {
        meanRGB: { r: 0, g: 0, b: 0 },
        meanHSV: { h: 0, s: 0, v: 0 },
      },
    };
  }

  const meanR = totalR / pixelCount;
  const meanG = totalG / pixelCount;
  const meanB = totalB / pixelCount;
  const meanHSV = rgbToHsv(meanR * 255, meanG * 255, meanB * 255);

  return {
    indices: {
      exg: totalExg / pixelCount,
      ngrdi: totalNgrdi / pixelCount,
      vari: totalVari / pixelCount,
    },
    colorData: {
      meanRGB: { r: Math.round(meanR * 255), g: Math.round(meanG * 255), b: Math.round(meanB * 255) },
      meanHSV: meanHSV,
    },
  };
}
