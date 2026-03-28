import * as tf from '@tensorflow/tfjs';

// CHANGE 1: Use GraphModel instead of LayersModel
let cachedModel: tf.GraphModel | null = null;

export async function loadNPKModel(): Promise<tf.GraphModel> {
  if (cachedModel) return cachedModel;

  try {
    // CHANGE 2: Use loadGraphModel
    cachedModel = await tf.loadGraphModel('/models/npk-mobilenet/model.json');
    console.log('[Lumifer] NPK model loaded successfully');
    
    // CHANGE 3: The "Warmup" (Crucial for UX)
    // Compiling WebGL shaders takes 1-3 seconds. Do it now in the background,
    // otherwise the app will freeze the moment the user hits "Scan".
    tf.tidy(() => {
      cachedModel!.predict(tf.zeros([1, 224, 224, 3])); // Adjust shape if needed
    });
    
    return cachedModel;
  } catch (err) {
    console.warn('[Lumifer] Failed to load NPK model:', err);
    throw err;
  }
}

export async function predict(model: tf.GraphModel, tensor: tf.Tensor4D): Promise<number[]> {
  return tf.tidy(() => {
    const prediction = model.predict(tensor) as tf.Tensor;
    return Array.from(prediction.dataSync());
  });
}
