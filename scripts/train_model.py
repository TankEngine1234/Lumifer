"""
Train MobileNetV2 for NPK deficiency classification — v3.
Uses REAL nutrient deficiency images (rice NPK dataset).
Multi-class softmax (4 classes: N-def, P-def, K-def, healthy).
Two-phase training: frozen backbone → fine-tune last layers.
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
EPOCHS_FROZEN = 20     # Phase 1: frozen backbone
EPOCHS_FINETUNE = 15   # Phase 2: fine-tune last layers
LR_FROZEN = 1e-3
LR_FINETUNE = 1e-5
DATASET_DIR = Path('data/training_v2')
OUTPUT_DIR = Path('models/npk-mobilenet-keras')

# Class indices — model outputs softmax over 4 classes
# At inference time we convert back to multi-label [N, P, K] confidence
CLASS_NAMES = ['healthy', 'nitrogen_deficient', 'phosphorus_deficient', 'potassium_deficient']
CLASS_TO_IDX = {name: i for i, name in enumerate(CLASS_NAMES)}


def load_dataset():
    """Load images with MobileNetV2 preprocessing. Returns images and integer class labels."""
    images = []
    labels = []

    for class_name in CLASS_NAMES:
        class_dir = DATASET_DIR / class_name
        if not class_dir.exists():
            print(f"  Warning: {class_dir} not found, skipping")
            continue

        idx = CLASS_TO_IDX[class_name]
        count = 0
        for img_path in sorted(class_dir.glob('*')):
            if img_path.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
                continue
            try:
                img = keras.utils.load_img(img_path, target_size=(IMG_SIZE, IMG_SIZE))
                img_array = keras.utils.img_to_array(img)
                img_array = preprocess_input(img_array)  # Scale to [-1, 1]
                images.append(img_array)
                labels.append(idx)
                count += 1
            except Exception as e:
                print(f"  Skipping {img_path.name}: {e}")
                continue

        print(f"  Loaded {count} images for {class_name} (class {idx})")

    return np.array(images, dtype=np.float32), np.array(labels, dtype=np.int32)


def create_model():
    """MobileNetV2 with augmentation for 4-class classification."""

    data_augmentation = keras.Sequential([
        layers.RandomFlip('horizontal_and_vertical'),
        layers.RandomRotation(0.25),       # ±45°
        layers.RandomZoom(0.2),            # ±20%
        layers.RandomContrast(0.15),       # ±15%
        layers.RandomBrightness(0.1),      # ±10%
        layers.RandomTranslation(0.1, 0.1),  # ±10% shift
    ], name="augmentation")

    base_model = keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights='imagenet',
    )
    base_model.trainable = False  # Frozen for phase 1

    inputs = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x = data_augmentation(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(64, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    # 4-class softmax: [healthy, N-def, P-def, K-def]
    outputs = layers.Dense(4, activation='softmax')(x)

    model = keras.Model(inputs, outputs)
    return model, base_model


def train():
    """Two-phase training pipeline."""
    print("Loading dataset...")
    X, y = load_dataset()

    if len(X) == 0:
        print("\nNo training data found!")
        print("Run: python scripts/prepare_dataset.py")
        return

    print(f"\nDataset: {len(X)} images, {len(CLASS_NAMES)} classes")
    for name in CLASS_NAMES:
        idx = CLASS_TO_IDX[name]
        print(f"  {name}: {int((y == idx).sum())}")

    # Shuffle and split
    rng = np.random.RandomState(42)
    indices = rng.permutation(len(X))
    X, y = X[indices], y[indices]

    split = int(0.85 * len(X))
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    print(f"\nTrain: {len(X_train)}, Validation: {len(X_val)}")

    # Compute class weights to handle imbalance
    class_counts = np.bincount(y_train, minlength=len(CLASS_NAMES))
    total = len(y_train)
    class_weights = {i: total / (len(CLASS_NAMES) * count) if count > 0 else 1.0
                     for i, count in enumerate(class_counts)}
    print(f"  Class weights: {class_weights}")

    train_ds = tf.data.Dataset.from_tensor_slices((X_train, y_train)) \
        .shuffle(2000) \
        .batch(BATCH_SIZE) \
        .prefetch(tf.data.AUTOTUNE)

    val_ds = tf.data.Dataset.from_tensor_slices((X_val, y_val)) \
        .batch(BATCH_SIZE) \
        .prefetch(tf.data.AUTOTUNE)

    # ── Phase 1: Train head only (frozen backbone) ──
    print("\n" + "=" * 50)
    print("PHASE 1: Training classification head (backbone frozen)")
    print("=" * 50)

    model, base_model = create_model()
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LR_FROZEN),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy'],
    )

    callbacks_p1 = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss', patience=6, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6
        ),
    ]

    model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS_FROZEN,
              callbacks=callbacks_p1, class_weight=class_weights)

    # ── Phase 2: Fine-tune last 30 layers of MobileNetV2 ──
    print("\n" + "=" * 50)
    print("PHASE 2: Fine-tuning last 30 layers of MobileNetV2")
    print("=" * 50)

    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    trainable_count = sum(1 for layer in base_model.layers if layer.trainable)
    print(f"  Trainable backbone layers: {trainable_count}")

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LR_FINETUNE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy'],
    )

    callbacks_p2 = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss', patience=5, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss', factor=0.5, patience=2, min_lr=1e-7
        ),
    ]

    model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS_FINETUNE,
              callbacks=callbacks_p2, class_weight=class_weights)

    # ── Save inference model (without augmentation layers) ──
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Build inference model that skips augmentation
    inference_input = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    # Find the base model and head layers, skip augmentation
    x = base_model(inference_input, training=False)
    # Replay head layers from the trained model
    for layer in model.layers:
        if isinstance(layer, layers.GlobalAveragePooling2D):
            x = layer(x)
        elif isinstance(layer, layers.Dense):
            x = layer(x)
        elif isinstance(layer, layers.Dropout):
            x = layer(x, training=False)

    inference_model = keras.Model(inference_input, x)
    inference_model.save(OUTPUT_DIR / 'model.keras')
    print(f"\nInference model saved to {OUTPUT_DIR / 'model.keras'}")

    # ── Evaluation ──
    print("\n" + "=" * 50)
    print("VALIDATION PERFORMANCE")
    print("=" * 50)

    y_pred_probs = model.predict(X_val, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)

    # Overall accuracy
    overall_acc = (y_pred == y_val).mean()
    print(f"\n  Overall accuracy: {overall_acc:.1%}")

    # Per-class metrics
    for idx, name in enumerate(CLASS_NAMES):
        pred_binary = (y_pred == idx).astype(int)
        true_binary = (y_val == idx).astype(int)

        tp = int(((pred_binary == 1) & (true_binary == 1)).sum())
        tn = int(((pred_binary == 0) & (true_binary == 0)).sum())
        fp = int(((pred_binary == 1) & (true_binary == 0)).sum())
        fn = int(((pred_binary == 0) & (true_binary == 1)).sum())

        acc = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        print(f"  {name}:")
        print(f"    Accuracy:  {acc:.1%}")
        print(f"    Precision: {precision:.1%}  Recall: {recall:.1%}  F1: {f1:.1%}")
        print(f"    (TP={tp} TN={tn} FP={fp} FN={fn})")

    # Confusion matrix
    print("\n  Confusion Matrix (rows=true, cols=pred):")
    print(f"  {'':>22} ", end="")
    for name in CLASS_NAMES:
        print(f"{name[:8]:>10}", end="")
    print()
    for true_idx, true_name in enumerate(CLASS_NAMES):
        print(f"  {true_name:>22} ", end="")
        for pred_idx in range(len(CLASS_NAMES)):
            count = int(((y_val == true_idx) & (y_pred == pred_idx)).sum())
            print(f"{count:>10}", end="")
        print()

    print(f"\nNext step: bash scripts/export_tfjs.sh")


if __name__ == '__main__':
    train()
