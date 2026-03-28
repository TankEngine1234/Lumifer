import type { VegetationIndices, ColorData } from '../types';
import { rgbToHsv } from '../utils/colorMath';

// Compute vegetation indices and color statistics from leaf pixel data
// Indices are based on published formulas:
//   ExG:   Woebbecke et al. (1995) - 2g - r - b (Using Chromatic Coordinates)
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

    // Skip pixels outside the mask (Alpha channel = 0)
    if (maskData && maskData[idx + 3] === 0) continue;

    const R = data[idx];
    const G = data[idx + 1];
    const B = data[idx + 2];

    // Scale to [0, 1] for average color and Tucker/Gitelson math
    const r_scaled = R / 255;
    const g_scaled = G / 255;
    const b_scaled = B / 255;

    totalR += r_scaled;
    totalG += g_scaled;
    totalB += b_scaled;

    // 🚨 FIX: Woebbecke's ExG REQUIRES Normalized Chromatic Coordinates
    const rgbSum = R + G + B;
    if (rgbSum > 0) {
      const r_chroma = R / rgbSum;
      const g_chroma = G / rgbSum;
      const b_chroma = B / rgbSum;
      totalExg += (2 * g_chroma) - r_chroma - b_chroma;
    }

    // Normalized Green-Red Difference Index: (G - R) / (G + R)
    const grSum = g_scaled + r_scaled;
    totalNgrdi += grSum > 0 ? (g_scaled - r_scaled) / grSum : 0;

    // Visible Atmospherically Resistant Index: (G - R) / (G + R - B)
    const grbDenom = g_scaled + r_scaled - b_scaled;
    totalVari += Math.abs(grbDenom) > 0.001 ? (g_scaled - r_scaled) / grbDenom : 0;

    pixelCount++;
  }

  // Prevent NaN if no leaf is detected in the mask
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
  
  // Convert mean back to [0, 255] for standard HSV conversion
  const meanHSV = rgbToHsv(meanR * 255, meanG * 255, meanB * 255);

  return {
    indices: {
      exg: totalExg / pixelCount,
      ngrdi: totalNgrdi / pixelCount,
      vari: totalVari / pixelCount,
    },
    colorData: {
      meanRGB: { 
        r: Math.round(meanR * 255), 
        g: Math.round(meanG * 255), 
        b: Math.round(meanB * 255) 
      },
      meanHSV: meanHSV,
    },
  };
}
