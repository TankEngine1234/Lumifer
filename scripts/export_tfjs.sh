#!/bin/bash
# Export trained Keras model to TensorFlow.js format
#
# Uses a Python venv to avoid protobuf conflicts with tensorflowjs 4.x.
# The CLI converter is buggy on paths with special characters — this script
# calls the Python API directly instead.
#
# Usage:
#   bash scripts/export_tfjs.sh

set -e

INPUT_DIR="models/npk-mobilenet-keras"
OUTPUT_DIR="public/models/npk-mobilenet"
VENV_DIR=".venv-tfjs"

if [ ! -d "$INPUT_DIR" ]; then
    echo "Error: Model not found at $INPUT_DIR"
    echo "Run 'python scripts/train_model.py' first."
    exit 1
fi

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python venv at $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install --quiet "tensorflow==2.16.2" "tensorflowjs==4.20.0"
else
    source "$VENV_DIR/bin/activate"
fi

mkdir -p "$OUTPUT_DIR"

echo "Converting model to TF.js format..."
echo "  Input:  $INPUT_DIR"
echo "  Output: $OUTPUT_DIR"

python3 - <<'PYEOF'
import sys, os
import tensorflowjs as tfjs
from tensorflow import keras

input_path = "models/npk-mobilenet-keras/model.keras"
output_dir = "public/models/npk-mobilenet"

model = keras.models.load_model(input_path)
tfjs.converters.save_keras_model(
    model,
    output_dir,
    quantization_dtype_map={"float16": "*"},
)
print("Conversion complete")
PYEOF

echo ""
echo "Done! Model exported to $OUTPUT_DIR"
echo "Files:"
ls -lh "$OUTPUT_DIR"
echo ""
echo "Total size:"
du -sh "$OUTPUT_DIR"
