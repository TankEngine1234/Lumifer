// Leaf segmentation using OpenCV.js
// Pipeline: RGB → HSV vegetation mask (green + yellow + brown) → Laplacian focus → combine
// Supports both healthy green leaves AND stressed/dead brown/yellow tissue.

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
    console.warn('[Lumifer] OpenCV not ready — using full image');
    return {
      segmentedImageData: imageData,
      leafMask: imageData,
      leafBounds: { x: 0, y: 0, width: imageData.width, height: imageData.height },
    };
  }

  const mats: any[] = [];
  const mat = (m: any) => { mats.push(m); return m; };

  try {
    const src = mat(cv.matFromImageData(imageData));
    const rgb = mat(new cv.Mat());
    const hsvImg = mat(new cv.Mat());
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsvImg, cv.COLOR_RGB2HSV);

    // ── Step 1: Multi-range vegetation mask ──
    // Green vegetation: H 25-95, S 30+, V 30+
    const greenLow = mat(new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [25, 30, 30, 0]));
    const greenHigh = mat(new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [95, 255, 255, 255]));
    const greenMask = mat(new cv.Mat());
    cv.inRange(hsvImg, greenLow, greenHigh, greenMask);

    // Yellow/chlorotic tissue: H 15-35, S 40+, V 60+
    const yellowLow = mat(new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [15, 40, 60, 0]));
    const yellowHigh = mat(new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [35, 255, 255, 255]));
    const yellowMask = mat(new cv.Mat());
    cv.inRange(hsvImg, yellowLow, yellowHigh, yellowMask);

    // Brown/necrotic tissue: H 5-30, S 15+, V 30+ (wide range — dead leaves can be very desaturated)
    const brownLow = mat(new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [5, 15, 30, 0]));
    const brownHigh = mat(new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [30, 220, 220, 255]));
    const brownMask = mat(new cv.Mat());
    cv.inRange(hsvImg, brownLow, brownHigh, brownMask);

    // Combine all vegetation masks
    const vegMask = mat(new cv.Mat());
    cv.bitwise_or(greenMask, yellowMask, vegMask);
    const vegMask2 = mat(new cv.Mat());
    cv.bitwise_or(vegMask, brownMask, vegMask2);

    // ── Step 2: Focus/sharpness mask (Laplacian) ──
    const gray = mat(new cv.Mat());
    cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY);

    const laplacian = mat(new cv.Mat());
    cv.Laplacian(gray, laplacian, cv.CV_16S, 3);

    const absLap = mat(new cv.Mat());
    cv.convertScaleAbs(laplacian, absLap);

    const focusMap = mat(new cv.Mat());
    cv.GaussianBlur(absLap, focusMap, new cv.Size(31, 31), 0);

    const focusMask = mat(new cv.Mat());
    cv.threshold(focusMap, focusMask, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

    const dilateKernel = mat(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(21, 21)));
    const focusDilated = mat(new cv.Mat());
    cv.dilate(focusMask, focusDilated, dilateKernel);

    // ── Step 3: Combine vegetation + focus ──
    const combined = mat(new cv.Mat());
    cv.bitwise_and(vegMask2, focusDilated, combined);

    // ── Step 4: Morphological cleanup ──
    const closeKernel = mat(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11)));
    const closed = mat(new cv.Mat());
    cv.morphologyEx(combined, closed, cv.MORPH_CLOSE, closeKernel);

    const openKernel = mat(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5)));
    const cleaned = mat(new cv.Mat());
    cv.morphologyEx(closed, cleaned, cv.MORPH_OPEN, openKernel);

    // ── Step 5: Find largest contour ──
    const contours = mat(new cv.MatVector());
    const hierarchy = mat(new cv.Mat());
    cv.findContours(cleaned, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let largestIdx = 0;
    let largestArea = 0;
    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i));
      if (area > largestArea) {
        largestArea = area;
        largestIdx = i;
      }
    }

    const imageArea = imageData.width * imageData.height;
    const contourRatio = largestArea / imageArea;

    const finalMask = mat(cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1));
    let bounds = { x: 0, y: 0, width: imageData.width, height: imageData.height };

    if (contours.size() > 0 && contourRatio < 0.85) {
      cv.drawContours(finalMask, contours, largestIdx, new cv.Scalar(255, 255, 255, 255), -1);
      const rect = cv.boundingRect(contours.get(largestIdx));
      bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      console.log(`[Lumifer] 🔬 Segmented leaf: ${(contourRatio * 100).toFixed(1)}% of image, bounds ${rect.width}x${rect.height}`);
    } else {
      // Fallback: center 60% crop
      const cx = Math.floor(imageData.width * 0.2);
      const cy = Math.floor(imageData.height * 0.2);
      const cw = Math.floor(imageData.width * 0.6);
      const ch = Math.floor(imageData.height * 0.6);
      cv.rectangle(finalMask, new cv.Point(cx, cy), new cv.Point(cx + cw, cy + ch), new cv.Scalar(255), -1);
      bounds = { x: cx, y: cy, width: cw, height: ch };
      console.warn(`[Lumifer] ⚠️ Segmentation fallback: contour was ${(contourRatio * 100).toFixed(1)}% of image — using center crop`);
    }

    // Apply mask
    const segmented = mat(new cv.Mat());
    cv.bitwise_and(src, src, segmented, finalMask);

    const segImageData = new ImageData(
      new Uint8ClampedArray(segmented.data),
      imageData.width,
      imageData.height
    );

    const rgbaMask = mat(new cv.Mat());
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
    for (const m of mats) {
      try { m.delete(); } catch { /* already freed */ }
    }
  }
}
