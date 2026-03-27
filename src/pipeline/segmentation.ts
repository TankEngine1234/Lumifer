// Leaf segmentation using OpenCV.js
// Pipeline: RGB → HSV → green mask → morphology → largest contour → masked leaf
// Falls back to full-image analysis if OpenCV is unavailable

declare const cv: any; // OpenCV.js global

export interface SegmentationResult {
  segmentedImageData: ImageData;
  leafMask: ImageData;
  leafBounds: { x: number; y: number; width: number; height: number };
}

export function isOpenCVReady(): boolean {
  return typeof cv !== 'undefined' && typeof cv.Mat !== 'undefined';
}

export function segmentLeaf(imageData: ImageData): SegmentationResult {
  if (!isOpenCVReady()) {
    // Fallback: use entire image as "leaf"
    return {
      segmentedImageData: imageData,
      leafMask: imageData,
      leafBounds: { x: 0, y: 0, width: imageData.width, height: imageData.height },
    };
  }

  const src = cv.matFromImageData(imageData);
  const hsv = new cv.Mat();
  const mask = new cv.Mat();
  const morphed = new cv.Mat();
  const segmented = new cv.Mat();

  try {
    // Convert to HSV
    cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
    const hsvConverted = new cv.Mat();
    cv.cvtColor(hsv, hsvConverted, cv.COLOR_RGB2HSV);

    // Threshold for green vegetation (H: 25-95, S: 40-255, V: 40-255)
    const low = new cv.Mat(hsvConverted.rows, hsvConverted.cols, hsvConverted.type(), [25, 40, 40, 0]);
    const high = new cv.Mat(hsvConverted.rows, hsvConverted.cols, hsvConverted.type(), [95, 255, 255, 255]);
    cv.inRange(hsvConverted, low, high, mask);

    // Morphological close to fill gaps
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
    cv.morphologyEx(mask, morphed, cv.MORPH_CLOSE, kernel);

    // Find contours and pick largest
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let largestIdx = 0;
    let largestArea = 0;
    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i));
      if (area > largestArea) {
        largestArea = area;
        largestIdx = i;
      }
    }

    // Create mask from largest contour
    const finalMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    if (contours.size() > 0) {
      cv.drawContours(finalMask, contours, largestIdx, new cv.Scalar(255), cv.FILLED);
    }

    // Apply mask to original image
    cv.bitwise_and(src, src, segmented, finalMask);

    // Get bounding rect
    let bounds = { x: 0, y: 0, width: imageData.width, height: imageData.height };
    if (contours.size() > 0) {
      const rect = cv.boundingRect(contours.get(largestIdx));
      bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }

    // Convert results back to ImageData
    const segCanvas = document.createElement('canvas');
    segCanvas.width = imageData.width;
    segCanvas.height = imageData.height;
    cv.imshow(segCanvas, segmented);
    const segCtx = segCanvas.getContext('2d')!;
    const segImageData = segCtx.getImageData(0, 0, imageData.width, imageData.height);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageData.width;
    maskCanvas.height = imageData.height;
    cv.imshow(maskCanvas, finalMask);
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskImageData = maskCtx.getImageData(0, 0, imageData.width, imageData.height);

    // Cleanup
    hsvConverted.delete(); low.delete(); high.delete(); kernel.delete();
    contours.delete(); hierarchy.delete(); finalMask.delete();

    return {
      segmentedImageData: segImageData,
      leafMask: maskImageData,
      leafBounds: bounds,
    };
  } finally {
    src.delete();
    hsv.delete();
    mask.delete();
    morphed.delete();
    segmented.delete();
  }
}
