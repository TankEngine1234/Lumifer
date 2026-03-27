import * as tf from '@tensorflow/tfjs';

let cachedModel: tf.LayersModel | null = null;

// Load the trained MobileNetV2 NPK deficiency model
// Model files expected at /models/npk-mobilenet/model.json
export async function loadNPKModel(): Promise<tf.LayersModel> {
  if (cachedModel) return cachedModel;

  try {
    cachedModel = await tf.loadLayersModel('/models/npk-mobilenet/model.json');
    console.log('[Lumifer] NPK model loaded successfully');
    return cachedModel;
  } catch (err) {
    console.warn('[Lumifer] Failed to load NPK model, falling back to heuristic inference:', err);
    throw err;
  }
}

// Run inference on preprocessed tensor
// Returns [N_confidence, P_confidence, K_confidence] as number[]
export async function predict(model: tf.LayersModel, tensor: tf.Tensor4D): Promise<number[]> {
  return tf.tidy(() => {
    const prediction = model.predict(tensor) as tf.Tensor;
    return Array.from(prediction.dataSync());
  });
}
