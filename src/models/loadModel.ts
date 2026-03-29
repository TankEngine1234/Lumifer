import * as tf from '@tensorflow/tfjs';

// Model outputs 4-class softmax: [healthy, N-deficient, P-deficient, K-deficient]
let cachedModel: tf.LayersModel | null = null;

export async function loadNPKModel(): Promise<tf.LayersModel> {
  if (cachedModel) return cachedModel;

  try {
    cachedModel = await tf.loadLayersModel('/models/npk-mobilenet/model.json');
    console.log('[Lumifer] NPK model loaded successfully');

    // GPU Warmup: compile WebGL shaders in the background
    tf.tidy(() => {
      cachedModel!.predict(tf.zeros([1, 224, 224, 3]));
    });

    return cachedModel;
  } catch (err) {
    console.warn('[Lumifer] Failed to load NPK model:', err);
    throw err;
  }
}

export async function predict(model: tf.LayersModel, tensor: tf.Tensor4D): Promise<number[]> {
  const prediction = tf.tidy(() => {
    return model.predict(tensor) as tf.Tensor;
  });

  const data = await prediction.data();
  prediction.dispose();

  return Array.from(data);
}
