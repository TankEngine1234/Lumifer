"""
Prepare REAL nutrient deficiency datasets for NPK model training.

Downloads two complementary datasets with actual NPK deficiency labels:
  1. Rice NPK Deficiency (Kaggle: guy007/nutrientdeficiencysymptomsinrice)
     - ~440 N, ~333 P, ~383 K images of rice leaves
  2. Coffee Leaf NPK (Mendeley: CoLeaf-DB) — optional supplement

Usage:
  pip install kagglehub pillow
  python scripts/prepare_dataset.py

Output:
  data/training_v2/ directory with class subdirectories
"""

import os
import shutil
import json
from pathlib import Path
from PIL import Image

try:
    import kagglehub
    HAS_KAGGLE = True
except ImportError:
    HAS_KAGGLE = False

OUTPUT_DIR = Path('data/training_v2')
SAMPLES_PER_CLASS = 600  # cap per class for balance
IMG_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}

# Mapping from dataset folder names to our standard classes
# These will be populated per-dataset below
CLASSES = ['nitrogen_deficient', 'phosphorus_deficient', 'potassium_deficient', 'healthy']


def is_image(path: Path) -> bool:
    return path.suffix in IMG_EXTENSIONS


def copy_images(src_dir: Path, dest_class: str, prefix: str, max_count: int) -> int:
    """Copy images from src_dir to OUTPUT_DIR/dest_class/. Returns count copied."""
    dest_dir = OUTPUT_DIR / dest_class
    dest_dir.mkdir(parents=True, exist_ok=True)

    existing = len(list(dest_dir.iterdir()))
    remaining = max_count - existing
    if remaining <= 0:
        return 0

    images = sorted([f for f in src_dir.iterdir() if is_image(f)])
    copied = 0
    for img_path in images[:remaining]:
        # Validate image is readable
        try:
            with Image.open(img_path) as im:
                im.verify()
        except Exception:
            continue

        dest = dest_dir / f"{prefix}_{img_path.name}"
        shutil.copy2(img_path, dest)
        copied += 1

    return copied


def prepare_rice_npk():
    """
    Rice NPK Deficiency Dataset (Kaggle: guy007/nutrientdeficiencysymptomsinrice)
    Real nutrient deficiency labels from controlled experiments.
    Folder structure: NitrogenDeficiency/, PhosphorusDeficiency/, PotassiumDeficiency/
    """
    print("\n=== Dataset 1: Rice NPK Deficiency ===")

    # Try kagglehub download
    source_dir = Path('data/rice-npk')
    if not source_dir.exists():
        if HAS_KAGGLE:
            print("Downloading via kagglehub...")
            try:
                path = kagglehub.dataset_download("guy007/nutrientdeficiencysymptomsinrice")
                source_dir = Path(path)
                print(f"Downloaded to {source_dir}")
            except Exception as e:
                print(f"kagglehub download failed: {e}")
                print("Please download manually from:")
                print("  https://www.kaggle.com/datasets/guy007/nutrientdeficiencysymptomsinrice")
                print(f"  Extract to: data/rice-npk/")
                return
        else:
            print("Please download manually from:")
            print("  https://www.kaggle.com/datasets/guy007/nutrientdeficiencysymptomsinrice")
            print(f"  Extract to: data/rice-npk/")
            print("  Or install kagglehub: pip install kagglehub")
            return

    # Map folder names to our classes — try various naming patterns
    folder_mapping = {
        'nitrogen_deficient': ['NitrogenDeficiency', 'Nitrogen', 'nitrogen', 'N', 'N_def', 'Nitrogen Deficiency'],
        'phosphorus_deficient': ['PhosphorusDeficiency', 'Phosphorus', 'phosphorus', 'P', 'P_def', 'Phosphorus Deficiency'],
        'potassium_deficient': ['PotassiumDeficiency', 'Potassium', 'potassium', 'K', 'K_def', 'Potassium Deficiency'],
    }

    # Find actual directory structure
    # The dataset might have images directly or in subdirectories
    candidate_roots = [source_dir]
    for subdir in source_dir.iterdir():
        if subdir.is_dir():
            candidate_roots.append(subdir)
            for sub2 in subdir.iterdir():
                if sub2.is_dir():
                    candidate_roots.append(sub2)

    total = 0
    for our_class, folder_names in folder_mapping.items():
        found = False
        for root in candidate_roots:
            for folder_name in folder_names:
                candidate = root / folder_name
                if candidate.is_dir():
                    count = copy_images(candidate, our_class, 'rice', SAMPLES_PER_CLASS)
                    print(f"  {our_class}: {count} images from {candidate}")
                    total += count
                    found = True
                    break
            if found:
                break
        if not found:
            # Try to find any directory with matching keyword
            for root in candidate_roots:
                for d in root.iterdir():
                    if d.is_dir() and any(kw.lower() in d.name.lower() for kw in folder_names):
                        count = copy_images(d, our_class, 'rice', SAMPLES_PER_CLASS)
                        print(f"  {our_class}: {count} images from {d}")
                        total += count
                        found = True
                        break
                if found:
                    break
        if not found:
            print(f"  {our_class}: NOT FOUND — looked for {folder_names}")

    print(f"  Rice NPK total: {total} images")
    return total


def prepare_rice_healthy():
    """
    Add healthy rice leaf images. Uses PlantVillage rice healthy if available,
    or healthy images from the Rice NPK dataset.
    """
    print("\n=== Healthy Baseline Images ===")

    # Try PlantVillage healthy images (already downloaded from previous training)
    pv_healthy_dirs = [
        Path('data/training/healthy'),  # from old prepare_dataset.py
        Path('data/plantvillage/plantvillage dataset/color/Rice___healthy'),
    ]

    for d in pv_healthy_dirs:
        if d.exists() and any(is_image(f) for f in d.iterdir()):
            count = copy_images(d, 'healthy', 'pv', SAMPLES_PER_CLASS)
            print(f"  healthy: {count} images from {d}")
            return count

    # Fallback: check if rice-npk has a healthy folder
    rice_dir = Path('data/rice-npk')
    if rice_dir.exists():
        for root, dirs, files in os.walk(rice_dir):
            root_path = Path(root)
            if any(kw in root_path.name.lower() for kw in ['healthy', 'normal', 'control']):
                count = copy_images(root_path, 'healthy', 'rice', SAMPLES_PER_CLASS)
                print(f"  healthy: {count} images from {root_path}")
                return count

    print("  healthy: No healthy images found — will use PlantVillage fallback")

    # Download PlantVillage just for healthy images
    if HAS_KAGGLE:
        try:
            path = kagglehub.dataset_download("abdallahalidev/plantvillage-dataset")
            pv = Path(path)
            for candidate in ['plantvillage dataset/color', 'color']:
                color_dir = pv / candidate
                if color_dir.exists():
                    total = 0
                    for folder in color_dir.iterdir():
                        if folder.is_dir() and 'healthy' in folder.name.lower():
                            count = copy_images(folder, 'healthy', 'pv', SAMPLES_PER_CLASS)
                            total += count
                            if total >= SAMPLES_PER_CLASS:
                                break
                    print(f"  healthy: {total} images from PlantVillage")
                    return total
        except Exception as e:
            print(f"  PlantVillage download failed: {e}")

    return 0


def print_summary():
    """Print final dataset statistics."""
    print("\n" + "=" * 50)
    print("DATASET SUMMARY")
    print("=" * 50)

    total = 0
    class_counts = {}
    for cls in CLASSES:
        cls_dir = OUTPUT_DIR / cls
        if cls_dir.exists():
            count = len([f for f in cls_dir.iterdir() if is_image(f)])
        else:
            count = 0
        class_counts[cls] = count
        total += count
        status = "✓" if count >= 100 else "⚠️ LOW" if count > 0 else "✗ MISSING"
        print(f"  {status} {cls}: {count} images")

    print(f"\n  Total: {total} images")
    print(f"  Output: {OUTPUT_DIR}")

    # Save metadata
    metadata = {
        'source': 'Rice NPK Deficiency (Kaggle: guy007/nutrientdeficiencysymptomsinrice) + PlantVillage healthy',
        'class_counts': class_counts,
        'total': total,
        'version': 'v2',
    }
    with open(OUTPUT_DIR / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    if total < 200:
        print("\n⚠️  Dataset is very small. Training may not produce good results.")
        print("   Make sure the Kaggle download completed successfully.")

    return total


if __name__ == '__main__':
    # Clean start
    if OUTPUT_DIR.exists():
        print(f"Removing existing {OUTPUT_DIR}...")
        shutil.rmtree(OUTPUT_DIR)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    prepare_rice_npk()
    prepare_rice_healthy()
    print_summary()

    print(f"\nNext step: python scripts/train_model.py")
