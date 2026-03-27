import { useState, useCallback } from 'react';
import type { ProcessingResult } from '../types';
import { segmentLeaf, isOpenCVReady } from '../pipeline/segmentation';
import { computeColorIndices } from '../pipeline/colorIndices';
import { preprocessForModel } from '../pipeline/preprocess';

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const process = useCallback(async (imageDataUrl: string): Promise<ProcessingResult> => {
    setIsProcessing(true);

    try {
      // Convert data URL to ImageData
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const originalImageData = ctx.getImageData(0, 0, img.width, img.height);

      // Wait for OpenCV if not ready yet (up to 5 seconds)
      if (!isOpenCVReady()) {
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const check = setInterval(() => {
            if (isOpenCVReady() || attempts > 50) {
              clearInterval(check);
              resolve();
            }
            attempts++;
          }, 100);
        });
      }

      // Segment leaf
      const { segmentedImageData, leafMask } = segmentLeaf(originalImageData);

      // Compute vegetation indices
      const { indices, colorData } = computeColorIndices(originalImageData, leafMask);

      // Preprocess for model
      const tensor = preprocessForModel(segmentedImageData);

      return {
        tensor,
        indices,
        colorData,
        segmentedImageData,
        originalImageData,
        leafMask,
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { process, isProcessing };
}
