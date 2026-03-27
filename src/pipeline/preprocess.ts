import * as tf from '@tensorflow/tfjs';

// Preprocess a leaf image for MobileNetV2 inference
// Input: ImageData (from segmented leaf)
// Output: tf.Tensor4D [1, 224, 224, 3] normalized to [0, 1]

export function preprocessForModel(imageData: ImageData): tf.Tensor4D {
  return tf.tidy(() => {
    // Convert ImageData to tensor
    const tensor = tf.browser.fromPixels(imageData);

    // Resize to 224×224 (MobileNetV2 input size)
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);

    // Normalize to [0, 1]
    const normalized = resized.div(255.0);

    // Add batch dimension: [224, 224, 3] → [1, 224, 224, 3]
    return normalized.expandDims(0) as tf.Tensor4D;
  });
}
