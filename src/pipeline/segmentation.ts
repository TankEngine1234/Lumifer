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
    return {
      segmentedImageData: imageData,
      leafMask: imageData,
      leafBounds: { x: 0, y: 0, width: imageData.width, height: imageData.height },
    };
  }

  // 🛡️ Declare ALL OpenCV pointers outside the try block for guaranteed cleanup
  let src: any, hsv: any, hsvConverted: any;
  let low: any, high: any, mask: any;
  let kernel: any, morphed: any;
  let contours: any, hierarchy: any;
  let finalMask: any, segmented: any, rgbaMask: any;

  try {
    src = cv.matFromImageData(imageData);
    hsv = new cv.Mat();
    hsvConverted = new cv.Mat();
    mask = new cv.Mat();
    morphed = new cv.Mat();
    segmented = new cv.Mat();
    finalMask = new cv.Mat();
    rgbaMask = new cv.Mat();

    // Convert to HSV (Safe 2-step conversion for WebAssembly)
    cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsvConverted, cv.COLOR_RGB2HSV);

    // Threshold for green vegetation
    low = new cv.Mat(hsvConverted.rows, hsvConverted.cols, hsvConverted.type(), [25, 40, 40, 0]);
    high = new cv.Mat(hsvConverted.rows, hsvConverted.cols, hsvConverted.type(), [95, 255, 255, 255]);
    cv.inRange(hsvConverted, low, high, mask);

    // Morphological close to fill gaps in the leaf
    kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
    cv.morphologyEx(mask, morphed, cv.MORPH_CLOSE, kernel);

    // Find contours
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
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
    finalMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let bounds = { x: 0, y: 0, width: imageData.width, height: imageData.height };
    
    if (contours.size() > 0) {
      // 🚨 FIX: use -1 instead of cv.FILLED for maximum version compatibility
      cv.drawContours(finalMask, contours, largestIdx, new cv.Scalar(255, 255, 255, 255), -1);
      
      const rect = cv.boundingRect(contours.get(largestIdx));
      bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }

    // Apply mask to original image
    cv.bitwise_and(src, src, segmented, finalMask);

    // 🚀 PERFORMANCE FIX: Bypass the DOM entirely!
    // Read the typed arrays directly out of WebAssembly memory.
    const segImageData = new ImageData(
      new Uint8ClampedArray(segmented.data),
      imageData.width,
      imageData.height
    );

    // finalMask is 1-channel (Grayscale). Convert to 4-channel (RGBA) for the browser.
    cv.cvtColor(finalMask, rgbaMask, cv.COLOR_GRAY2RGBA);
    const maskImageData = new ImageData(
      new Uint8ClampedArray(rgbaMask.data),
      imageData.width,
      imageData.height
    );

    return {
      segmentedImageData: segImageData,
      leafMask: maskImageData,
      leafBounds: bounds,
    };

  } finally {
    // 🛡️ BULLETPROOF CLEANUP: This runs no matter what happens above.
    if (src) src.delete();
    if (hsv) hsv.delete();
    if (hsvConverted) hsvConverted.delete();
    if (low) low.delete();
    if (high) high.delete();
    if (mask) mask.delete();
    if (kernel) kernel.delete();
    if (morphed) morphed.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
    if (finalMask) finalMask.delete();
    if (segmented) segmented.delete();
    if (rgbaMask) rgbaMask.delete();
  }
}
