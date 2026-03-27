"""
Prepare PlantVillage dataset for NPK deficiency model training.

Downloads a curated subset of PlantVillage images and maps disease labels
to NPK deficiency categories:
  - Yellowing/chlorosis → Nitrogen deficiency
  - Purple/reddish discoloration → Phosphorus deficiency
  - Brown leaf edges/necrosis → Potassium deficiency
  - Healthy → All nutrients adequate

Usage:
  pip install tensorflow kagglehub pillow
  python scripts/prepare_dataset.py

Output:
  data/training/ directory with class subdirectories
"""

import os
import shutil
import json
from pathlib import Path

# Try kagglehub first, fall back to manual instructions
try:
    import kagglehub
    HAS_KAGGLE = True
except ImportError:
    HAS_KAGGLE = False

# PlantVillage disease-to-NPK mapping
# Based on visual symptom correlation with nutrient deficiencies
DISEASE_TO_NPK = {
    # Nitrogen deficiency analogs (yellowing, chlorosis)
    'Corn_(maize)___Northern_Leaf_Blight': 'nitrogen_deficient',
    'Corn_(maize)___Common_rust_': 'nitrogen_deficient',  # Early yellowing stage
    'Tomato___Leaf_Mold': 'nitrogen_deficient',  # Yellowing pattern
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': 'nitrogen_deficient',

    # Phosphorus deficiency analogs (purple/red discoloration)
    'Grape___Black_rot': 'phosphorus_deficient',  # Purple/dark discoloration
    'Tomato___Septoria_leaf_spot': 'phosphorus_deficient',
    'Potato___Early_blight': 'phosphorus_deficient',  # Dark concentric rings

    # Potassium deficiency analogs (brown edges, necrosis)
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': 'potassium_deficient',
    'Tomato___Early_blight': 'potassium_deficient',  # Brown edge necrosis
    'Potato___Late_blight': 'potassium_deficient',  # Brown lesions
    'Tomato___Bacterial_spot': 'potassium_deficient',

    # Healthy baselines
    'Corn_(maize)___healthy': 'healthy',
    'Tomato___healthy': 'healthy',
    'Potato___healthy': 'healthy',
    'Grape___healthy': 'healthy',
    'Soybean___healthy': 'healthy',
}

# Target samples per class
SAMPLES_PER_CLASS = 500
OUTPUT_DIR = Path('data/training')
DEMO_OUTPUT_DIR = Path('public/assets/leaves')


def download_plantvillage():
    """Download PlantVillage dataset via kagglehub."""
    if HAS_KAGGLE:
        print("Downloading PlantVillage dataset via kagglehub...")
        path = kagglehub.dataset_download("abdallahalidev/plantvillage-dataset")
        return Path(path)
    else:
        print("""
=== Manual Download Required ===
1. Go to: https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset
2. Download and extract to: data/plantvillage/
3. Re-run this script

Or install kagglehub: pip install kagglehub
""")
        return None


def prepare_dataset(source_dir: Path):
    """Curate PlantVillage images into NPK deficiency classes."""
    # Create output directories
    for cls in ['nitrogen_deficient', 'phosphorus_deficient', 'potassium_deficient', 'healthy']:
        (OUTPUT_DIR / cls).mkdir(parents=True, exist_ok=True)

    DEMO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    class_counts = {cls: 0 for cls in set(DISEASE_TO_NPK.values())}

    # Walk through PlantVillage directory structure
    # Expected: source_dir/color/ClassName/images...
    color_dir = source_dir / 'plantvillage dataset' / 'color'
    if not color_dir.exists():
        # Try alternative paths
        for candidate in ['color', 'PlantVillage', 'plantvillage']:
            alt = source_dir / candidate
            if alt.exists():
                color_dir = alt
                break

    if not color_dir.exists():
        print(f"Could not find image directory in {source_dir}")
        print(f"Contents: {list(source_dir.iterdir())}")
        return

    for disease_dir in sorted(color_dir.iterdir()):
        if not disease_dir.is_dir():
            continue

        disease_name = disease_dir.name
        npk_class = DISEASE_TO_NPK.get(disease_name)

        if npk_class is None:
            continue

        if class_counts[npk_class] >= SAMPLES_PER_CLASS:
            continue

        images = sorted(disease_dir.glob('*.jpg')) + sorted(disease_dir.glob('*.JPG'))
        remaining = SAMPLES_PER_CLASS - class_counts[npk_class]

        for img_path in images[:remaining]:
            dest = OUTPUT_DIR / npk_class / f"{disease_name}_{img_path.name}"
            shutil.copy2(img_path, dest)
            class_counts[npk_class] += 1

            # Copy first 3 per class to demo assets
            if class_counts[npk_class] <= 3:
                demo_name = f"{npk_class}_{class_counts[npk_class]:02d}.jpg"
                shutil.copy2(img_path, DEMO_OUTPUT_DIR / demo_name)

    print("\nDataset prepared:")
    for cls, count in class_counts.items():
        print(f"  {cls}: {count} images")
    print(f"\nTotal: {sum(class_counts.values())} images")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Demo assets: {DEMO_OUTPUT_DIR}")

    # Save metadata
    metadata = {
        'source': 'PlantVillage (Kaggle: abdallahalidev/plantvillage-dataset)',
        'mapping': DISEASE_TO_NPK,
        'class_counts': class_counts,
        'samples_per_class_target': SAMPLES_PER_CLASS,
    }
    with open(OUTPUT_DIR / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)


if __name__ == '__main__':
    # Check for existing download
    local_path = Path('data/plantvillage')

    if local_path.exists():
        print(f"Using existing dataset at {local_path}")
        prepare_dataset(local_path)
    else:
        source = download_plantvillage()
        if source:
            prepare_dataset(source)
