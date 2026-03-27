# Lumifer — Precision Crop Nutrient Scanner

A mobile-first React PWA that combines satellite NDVI triage with on-device AI leaf diagnosis to detect nitrogen, phosphorus, and potassium (NPK) deficiencies at field scale.

## How It Works

**Stage 1 — Satellite Triage (Field Map)**
Sentinel-2 NDVI imagery identifies specific zones in a field showing low vegetation health. This tells the farmer *where* to investigate, solving the "you can't generalize one leaf to hundreds of acres" problem.

**Stage 2 — Leaf-Level Diagnosis (Phone Scan)**
The farmer walks to the flagged zone and photographs a leaf. Lumifer runs an on-device MobileNetV2 model to output NPK confidence scores, then displays spectral heatmap overlays, severity assessment, fertilizer recommendations, and yield impact estimates.

## Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS v4 + Framer Motion (spring physics) |
| ML inference | TensorFlow.js (MobileNetV2, on-device) |
| Image pipeline | OpenCV.js (HSV segmentation + vegetation indices) |
| PWA | vite-plugin-pwa + Workbox |

## Project Structure

```
src/
├── components/
│   ├── fieldmap/        # Satellite NDVI field view + zone pins + zone card
│   ├── capture/         # Camera viewfinder + capture button
│   ├── analysis/        # Analysis overlay + spectral heatmap reveal
│   ├── results/         # NPK dials, severity card, action plans, yield card
│   └── ui/              # GlassCard, Badge, Logo, GradientBackground
├── hooks/
│   ├── useCamera.ts         # Rear-camera access + frame capture
│   ├── useImageProcessing.ts # OpenCV pipeline wrapper
│   └── useInference.ts       # TF.js model load + predict
├── pipeline/
│   ├── segmentation.ts      # HSV threshold → contour → leaf mask
│   ├── colorIndices.ts      # ExG, NGRDI, VARI per-pixel computation
│   ├── heatmapRenderer.ts   # Per-pixel false-color canvas rendering
│   └── preprocess.ts        # Tensor normalization for MobileNetV2
├── models/
│   ├── loadModel.ts         # TF.js model loader with caching
│   └── fallbackInference.ts # Heuristic safety net (real agronomic thresholds)
├── data/
│   ├── fieldZones.ts        # Sentinel-2 derived NDVI zone data
│   ├── leafDataset.ts       # Curated PlantVillage samples with computed indices
│   ├── nutrientThresholds.ts # NPK critical levels (Texas A&M AgriLife / USDA)
│   ├── spectralReference.ts # RGB-to-spectral correlation coefficients
│   └── actionPlans.ts       # Fertilizer recommendations (AgriLife Extension rates)
├── animations/
│   ├── springs.ts           # Apple-style spring configs
│   ├── variants.ts          # Framer Motion variants
│   └── demoSequence.ts      # 90-second demo phase timing
└── App.tsx                  # Phase state machine (splash → fieldmap → capture → results)
scripts/
├── prepare_dataset.py   # Download & curate PlantVillage subset via kagglehub
├── train_model.py       # MobileNetV2 transfer learning (Keras)
└── export_tfjs.sh       # Convert SavedModel → TF.js graph model (uint8 quantized)
```

## Real Data Sources

- **Leaf images**: PlantVillage dataset — disease labels mapped to NPK deficiency categories (yellowing→N, purple discoloration→P, brown leaf edges→K)
- **NPK thresholds**: Texas A&M AgriLife Extension leaf tissue sufficiency ranges (Mills & Jones, 1996)
- **Yield impact**: IPNI published field trial data by deficiency type and severity
- **Fertilizer rates**: USDA NRCS Practice Standard 590 + AgriLife Extension recommendations
- **Spectral coefficients**: Datt (1998), Gitelson & Merzlyak (1996) RGB-to-NIR correlations
- **Vegetation indices**: ExG (Woebbecke et al., 1995), NGRDI (Tucker, 1979), VARI (Gitelson et al., 2002)

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` — tap the field map zones to walk through the demo flow.

Add `?demo=true` to the URL for the auto-advancing 90-second demo sequence.

Triple-tap the top-right corner at any point to skip directly to results.

## Model Training (one-time setup)

```bash
# 1. Install Python deps
pip install tensorflow pillow numpy kagglehub

# 2. Download and curate PlantVillage subset
python scripts/prepare_dataset.py

# 3. Train MobileNetV2 transfer learning model
python scripts/train_model.py

# 4. Convert to TF.js format (~3-5 MB quantized)
pip install tensorflowjs
bash scripts/export_tfjs.sh
```

The exported model lands at `public/models/npk-mobilenet/` and is served as a static asset. The app falls back to a heuristic inference path if the model file is absent.

## Build

```bash
npm run build
```

Output in `dist/` — includes PWA service worker for offline use and model pre-caching.
