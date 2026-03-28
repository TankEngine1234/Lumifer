import * as tf from '@tensorflow/tfjs';

// 1. Using GraphModel to correctly parse the converted TensorFlow SavedModel
let cachedModel: tf.GraphModel | null = null;

export async function loadNPKModel(): Promise<tf.GraphModel> {
  if (cachedModel) return cachedModel;

  try {
    // 2. Load the web-optimized model from the public directory
    cachedModel = await tf.loadGraphModel('/models/npk-mobilenet/model.json');
    console.log('[Lumifer] NPK model loaded successfully');
    
    // 3. GPU Warmup: Run a dummy tensor to compile WebGL shaders in the background.
    // This prevents the app from freezing for 3 seconds when the user clicks "Scan" for the first time.
    tf.tidy(() => {
      cachedModel!.predict(tf.zeros([1, 224, 224, 3])); 
    });
    
    return cachedModel;
  } catch (err) {
    console.warn('[Lumifer] Failed to load NPK model:', err);
    throw err;
  }
}

export async function predict(model: tf.GraphModel, tensor: tf.Tensor4D): Promise<number[]> {
  // 4. Run the prediction inside tidy to clean up the internal math tensors
  const prediction = tf.tidy(() => {
    return model.predict(tensor) as tf.Tensor;
  });

  // 5. Await the data ASYNCHRONOUSLY so the JS main thread isn't blocked.
  // This guarantees Framer Motion animations stay at a buttery 60fps.
  const data = await prediction.data();

  // 6. Manually dispose of the final prediction tensor to prevent GPU memory leaks
  prediction.dispose();

  return Array.from(data);
}
