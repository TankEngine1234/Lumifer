"""
Train MobileNetV2 for NPK deficiency classification.

Uses transfer learning on PlantVillage-derived dataset:
  - Base: MobileNetV2 (ImageNet weights, frozen)
  - Top: GlobalAveragePooling → Dense(128) → Dropout(0.3) → Dense(3, sigmoid)
  - Output: [N_confidence, P_confidence, K_confidence] (multi-label)

Usage:
  pip install tensorflow pillow numpy
  python scripts/prepare_dataset.py  # First, prepare the dataset
  python scripts/train_model.py

Output:
  models/npk-mobilenet-keras/  (SavedModel format)
"""

import os
import numpy as np
from pathlib import Path

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

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
    """Load images and create multi-label arrays."""
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
            img_array = keras.utils.img_to_array(img) / 255.0
            images.append(img_array)
            labels.append(label_vec)
            count += 1

        print(f"Loaded {count} images for {class_name}")

    return np.array(images), np.array(labels)


def create_model():
    """Create MobileNetV2 transfer learning model."""
    # Load MobileNetV2 base (frozen)
    base_model = keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights='imagenet',
    )
    base_model.trainable = False

    # Build classification head
    model = keras.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(3, activation='sigmoid'),  # Multi-label: [N, P, K]
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='binary_crossentropy',
        metrics=['binary_accuracy'],
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

    # Data augmentation
    augmentation = keras.Sequential([
        layers.RandomFlip('horizontal'),
        layers.RandomRotation(0.15),
        layers.RandomZoom(0.1),
        layers.RandomBrightness(0.1),
        layers.RandomContrast(0.1),
    ])

    # Create augmented training dataset
    train_ds = tf.data.Dataset.from_tensor_slices((X_train, y_train))
    train_ds = train_ds.shuffle(1000).batch(BATCH_SIZE)
    train_ds = train_ds.map(
        lambda x, y: (augmentation(x, training=True), y),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)

    val_ds = tf.data.Dataset.from_tensor_slices((X_val, y_val)).batch(BATCH_SIZE)

    # Create and train model
    print("\nCreating model...")
    model = create_model()
    model.summary()

    print("\nTraining...")
    callbacks = [
        keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=3),
    ]

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=callbacks,
    )

    # Evaluate
    val_loss, val_acc = model.evaluate(val_ds)
    print(f"\nValidation loss: {val_loss:.4f}")
    print(f"Validation accuracy: {val_acc:.4f}")

    # Save model
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model.save(OUTPUT_DIR)
    print(f"\nModel saved to {OUTPUT_DIR}")

    # Print class-level performance
    y_pred = model.predict(X_val)
    for i, name in enumerate(['Nitrogen', 'Phosphorus', 'Potassium']):
        pred_binary = (y_pred[:, i] > 0.5).astype(int)
        true_binary = y_val[:, i].astype(int)
        acc = np.mean(pred_binary == true_binary)
        print(f"  {name}: {acc:.2%} accuracy")

    print(f"\nNext step: python scripts/export_tfjs.sh")


if __name__ == '__main__':
    train()
