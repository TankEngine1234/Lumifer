"""
Train MobileNetV2 for NPK deficiency classification.
Refactored for optimal Transfer Learning and TFJS export.
"""

import os
import numpy as np
from pathlib import Path

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input 

# Config
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 20
LEARNING_RATE = 1e-4
DATASET_DIR = Path('data/training')
OUTPUT_DIR = Path('models/npk-mobilenet-keras')

# Multi-label encoding: [N_deficient, P_deficient, K_deficient]
CLASS_TO_LABELS = {
    'nitrogen_deficient':   [1.0, 0.0, 0.0],
    'phosphorus_deficient': [0.0, 1.0, 0.0],
    'potassium_deficient':  [0.0, 0.0, 1.0],
    'healthy':              [0.0, 0.0, 0.0],
}

def load_dataset():
    """Load images and apply strict MobileNetV2 preprocessing."""
    images = []
    labels = []

    for class_name, label_vec in CLASS_TO_LABELS.items():
        class_dir = DATASET_DIR / class_name
        if not class_dir.exists():
            print(f"Warning: {class_dir} not found, skipping")
            continue

        count = 0
        for img_path in sorted(class_dir.glob('*.jpg')):
            img = keras.utils.load_img(img_path, target_size=(IMG_SIZE, IMG_SIZE))
            img_array = keras.utils.img_to_array(img)
            
            # 🚨 FIX 1: Use official MobileNetV2 preprocessing (scales to [-1, 1] instead of [0, 1])
            img_array = preprocess_input(img_array)
            
            images.append(img_array)
            labels.append(label_vec)
            count += 1

        print(f"Loaded {count} images for {class_name}")

    # 🚨 FIX 2: Force float32 to prevent RAM from doubling in size
    return np.array(images, dtype=np.float32), np.array(labels, dtype=np.float32)

def create_model():
    """Create MobileNetV2 transfer learning model."""
    
    # 🚨 FIX 3: Bake augmentation directly into the model so it exports cleanly
    data_augmentation = keras.Sequential([
        layers.RandomFlip('horizontal_and_vertical'),
        layers.RandomRotation(0.2),
        layers.RandomZoom(0.15),
        layers.RandomContrast(0.1),
    ], name="augmentation_layer")

    # Load MobileNetV2 base (frozen)
    base_model = keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights='imagenet',
    )
    base_model.trainable = False

    # Build classification head
    inputs = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x = data_augmentation(inputs) # Augmentation only active during training automatically
    x = base_model(x, training=False) # Ensure BatchNorm layers stay frozen
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(3, activation='sigmoid')(x)  # Multi-label: [N, P, K]

    model = keras.Model(inputs, outputs)

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='binary_crossentropy',
        metrics=['binary_accuracy', keras.metrics.AUC(multi_label=True)],
    )

    return model

def train():
    """Main training pipeline."""
    print("Loading dataset...")
    X, y = load_dataset()

    if len(X) == 0:
        print("No training data found. Run prepare_dataset.py first.")
        return

    print(f"\nDataset: {len(X)} images, {y.shape[1]} labels")

    # Shuffle and split
    indices = np.random.permutation(len(X))
    X, y = X[indices], y[indices]

    split = int(0.85 * len(X))
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    print(f"Train: {len(X_train)}, Validation: {len(X_val)}")

    # Standard tf.data pipelines (Augmentation is now inside the model)
    train_ds = tf.data.Dataset.from_tensor_slices((X_train, y_train))\
        .shuffle(1000)\
        .batch(BATCH_SIZE)\
        .prefetch(tf.data.AUTOTUNE)

    val_ds = tf.data.Dataset.from_tensor_slices((X_val, y_val))\
        .batch(BATCH_SIZE)\
        .prefetch(tf.data.AUTOTUNE)

    print("\nCreating model...")
