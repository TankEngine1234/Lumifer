import * as tf from '@tensorflow/tfjs';

/**
 * Preprocess a leaf image for MobileNetV2 inference
 * File: src/pipeline/preprocess.ts
 */
export function preprocessForModel(imageData: ImageData): tf.Tensor4D {
  return tf.tidy(() => {
    // 1. Convert ImageData to tensor
    const tensor = tf.browser.fromPixels(imageData);

    // 2. CROP TO SQUARE (Prevents leaf distortion)
    const [height, width] = tensor.shape;
    const size = Math.min(height, width);
    const centerHeight = Math.floor((height - size) / 2);
    const centerWidth = Math.floor((width - size) / 2);
    const cropped = tensor.slice([centerHeight, centerWidth, 0], [size, size, 3]);

    // 3. Resize to 224x224 (MobileNetV2 input size)
    const resized = tf.image.resizeBilinear(cropped, [224, 224]);

    // 4. Normalize to [0, 1]
    const normalized = resized.div(255.0);

    // 5. Add batch dimension: [1, 224, 224, 3]
    return normalized.expandDims(0) as tf.Tensor4D;
  });
}
