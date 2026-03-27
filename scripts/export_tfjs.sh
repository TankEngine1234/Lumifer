#!/bin/bash
# Export trained Keras model to TensorFlow.js format
#
# Prerequisites:
#   pip install tensorflowjs
#
# Usage:
#   bash scripts/export_tfjs.sh

set -e

INPUT_DIR="models/npk-mobilenet-keras"
OUTPUT_DIR="public/models/npk-mobilenet"

if [ ! -d "$INPUT_DIR" ]; then
    echo "Error: Model not found at $INPUT_DIR"
    echo "Run 'python scripts/train_model.py' first."
    exit 1
fi

echo "Converting model to TF.js format..."
echo "  Input:  $INPUT_DIR"
echo "  Output: $OUTPUT_DIR"

# Convert with uint8 quantization for smaller bundle (~3-5MB vs ~14MB)
tensorflowjs_converter \
    --input_format=tf_saved_model \
    --output_format=tfjs_graph_model \
    --quantize_uint8 \
    "$INPUT_DIR" \
    "$OUTPUT_DIR"

echo ""
echo "Done! Model exported to $OUTPUT_DIR"
echo "Files:"
ls -lh "$OUTPUT_DIR"
echo ""
echo "Total size:"
du -sh "$OUTPUT_DIR"
