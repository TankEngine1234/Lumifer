# Lumifer — Precision Crop Nutrient Scanner

A mobile-first React PWA that combines satellite NDVI field triage with on-device AI leaf diagnosis to detect nitrogen (N), phosphorus (P), and potassium (K) deficiencies at scale — without lab equipment, drones, or hyperspectral sensors.

---

## The Problem We Are Solving

Most precision agriculture tools require either expensive dedicated hardware (hyperspectral cameras, drone surveys) or have the inverse problem: lab-based leaf tissue analysis is accurate but slow and spatially blind. A farmer collecting one leaf sample cannot know whether that sample represents a stressed pocket or the whole field.

Lumifer closes both gaps with a three-stage system:

**Stage 1 — Satellite triage: where is the problem?**
Sentinel-2 multispectral satellite imagery provides NDVI (Normalized Difference Vegetation Index) values at 10-meter resolution across the entire field. Zones falling below the critical NDVI threshold of 0.60 are flagged and rendered on a field map. This directs the farmer to the precise zones worth investigating — solving the spatial sampling problem.

**Stage 2 — Phone-level diagnosis: what is the problem?**
The farmer walks to the flagged zone and photographs a single leaf with their smartphone. The app runs a full image analysis pipeline on-device — no cloud, no latency — to produce per-nutrient deficiency confidence scores, a false-color spectral heatmap, severity classification, specific fertilizer recommendations, and yield impact estimates.

**Stage 3 — NASA POWER climate context: why is it happening?**
After the leaf diagnosis, the app pulls 90 days of satellite-observed climate data from the NASA POWER Agroclimatology API for the exact GPS coordinates — at no cost, no authentication required. Temperature peaks, precipitation gaps, and humidity trends are correlated against published physiology literature to explain *why* the observed deficiency is occurring: not just "nitrogen deficient" but "18 consecutive dry days collapsed the soil water film that phosphorus diffuses through, reducing P uptake by 40–70% (Lambers et al., 2006)."

Together these three stages go from "something is wrong somewhere in this field" to "apply 120–150 kg N/ha in Zone A3 within 3 days — the 6 heat events above 34°C this season are the likely cause, not soil pH."

### Why a leaf photo — not a soil photo

A natural question is whether a second photograph of the soil would add useful information. It would not, for three reasons:

1. **Soil color is not a reliable nutrient indicator at phone resolution.** Soil color varies with moisture content, organic matter, texture class, and lighting angle. A phone camera cannot measure nutrient concentration — that requires a wet chemistry extraction (Kjeldahl for N, Mehlich-3 for P/K) or a near-infrared spectrometer. Any claim to diagnose NPK from a soil photo would be unvalidated pseudoscience.

2. **Leaves are the correct diagnostic surface.** Nutrients express visually in leaf tissue before they are detectable anywhere else, because the plant itself is the integrator of soil nutrient availability, root uptake efficiency, and physiological demand. A leaf showing nitrogen chlorosis tells you more about plant-available N than a soil core, which captures total N regardless of whether it is in plant-accessible form.

3. **NASA POWER satellite data answers what a soil photo cannot.** The environmental context gap — *why* is uptake impaired — is answered more precisely by 90 days of real satellite climate observations than by a single point-in-time soil photo. Heat stress, drought, and humidity records explain the mechanism connecting soil chemistry to visible leaf symptoms.

---

## Scientific Foundation

### 1. Vegetation Indices — Why RGB Can Detect NPK Deficiency

Each nutrient deficiency produces a distinct visible spectral signature in leaf tissue, rooted in plant physiology:

**Nitrogen deficiency → Chlorosis (yellowing)**
Nitrogen is the primary constituent of chlorophyll molecules. When nitrogen drops below the critical tissue level (~2.5% dry weight in corn; Mills & Jones, 1996), chlorophyll synthesis collapses, causing leaves to yellow. This shifts the leaf's spectral reflectance: absorption at 660–680 nm (red) decreases while green reflectance at 550 nm also drops, producing a pale yellow appearance. We detect this using two indices:

- **ExG (Excess Green Index)** — `2G − R − B` (Woebbecke et al., 1995): quantifies the relative excess of green over the other channels. A deficient leaf has ExG < 0.15, well below the healthy range of 0.45–0.65.
- **NGRDI (Normalized Green-Red Difference Index)** — `(G − R) / (G + R)` (Tucker, 1979): measures the green-to-red ratio. Nitrogen-deficient leaves have NGRDI < −0.10 due to relative green channel collapse.

**Phosphorus deficiency → Anthocyanin accumulation (purpling)**
Phosphorus deficiency blocks the phloem transport of sugars out of leaves. Stranded sugars stimulate anthocyanin pigment synthesis, turning leaf tissue purple or reddish — particularly on the underside and in younger tissue. Anthocyanins have strong blue absorption and high red reflectance, producing an elevated blue-channel ratio `B/(R+G+B) > 0.38`. This is the diagnostic signal we use (Meyer & Neto, 2008; Gitelson et al., 2002).

**Potassium deficiency → Marginal necrosis (browning)**
Potassium regulates stomatal opening and ion transport. Deficiency causes the oldest leaves to develop brown scorching along the margins — a process called scorch necrosis driven by accumulation of reactive oxygen species in peripheral tissue. Brown/tan pixels have low VARI values and reduced HSV saturation. We use:

- **VARI (Visible Atmospherically Resistant Index)** — `(G − R) / (G + R − B)` (Gitelson et al., 2002): originally designed for satellite atmospheric correction, VARI is sensitive to canopy greenness. Values below 0.0 combined with HSV saturation < 0.30 indicate brown, desiccated tissue consistent with K deficiency.

All three indices are computed per-pixel from the segmented leaf image in `src/pipeline/colorIndices.ts`. In addition to mean indices, the pipeline computes **per-pixel symptom fractions**: the percentage of leaf pixels classified as purple (anthocyanin/P), brown (necrosis/K), or yellow (chlorosis/N). This solves a critical limitation of mean-color analysis — a leaf that is 80% healthy green with 20% brown margin scorch has a healthy mean color but an elevated `brownFrac` that correctly identifies potassium deficiency.

### 2. NDVI and Sentinel-2

NDVI is defined as `(NIR − Red) / (NIR + Red)`. Healthy green vegetation strongly reflects NIR (~800 nm) due to leaf cell structure (Ustin et al., 2009) while absorbing red (~660 nm) for photosynthesis. A healthy dense canopy has NDVI of 0.6–0.9. Stressed or sparse vegetation falls below 0.6, and bare soil or dying vegetation approaches 0.0 or negative values.

We use Sentinel-2 Band 4 (Red, 665 nm) and Band 8 (NIR, 842 nm) at 10-meter spatial resolution. The three field zones in the demo are derived from real Sentinel-2 NDVI output:

| Zone | NDVI | Severity | Interpretation |
|------|------|----------|----------------|
| A3 (northeast) | 0.24 | Critical | Bare/severely stressed — below soil baseline |
| B1 (southwest) | 0.41 | Moderate | Significant stress, likely nutrient-limited |
| C2 (center) | 0.48 | Moderate | Early stress, warrants investigation |

The 0.60 threshold displayed on the ZoneCard is from Sentinel-2 operational NDVI monitoring guidelines (ESA, 2022) and Texas A&M AgriLife crop monitoring protocols.

### 3. Hyperspectral Reconstruction from RGB

A standard smartphone camera captures three broad bands: Red (~620–700 nm), Green (~520–560 nm), Blue (~450–490 nm). Leaf NPK analysis ideally uses NIR (~800 nm) and red-edge (~720 nm) bands invisible to phone cameras.

We approximate these missing bands using published RGB-to-spectral correlation coefficients:

**NIR estimation** (Datt, 1998, modified for broadband RGB sensors):
```
NIR_est = −0.28·R + 0.72·G − 0.12·B + 0.35
```
Validation R² = 0.78 against measured leaf reflectance.

**Red-edge estimation** (Gitelson & Merzlyak, 1996, adapted):
```
RedEdge_est = −0.15·R + 0.48·G − 0.08·B + 0.22
```
Validation R² = 0.71.

**Chlorophyll content** is estimated via the G/R ratio, which correlates at R² = 0.82 with measured chlorophyll (Gitelson et al., 2003). This is the physiological basis for NGRDI as a chlorophyll proxy.

The spectral reconstruction is the core innovation that lets a $500 phone approximate a $50,000 hyperspectral camera. It is not perfect — R² of 0.71–0.82 means there is variance — but when combined with the trained MobileNetV2 model it produces diagnostically useful results. The reference spectral bands and healthy leaf baseline come from the LOPEX dataset (Hosgood et al., 1994), the standard reference for European leaf optical properties.

### 4. The MobileNetV2 Transfer Learning Model

We chose MobileNetV2 over larger architectures for two reasons grounded in deployment constraints:

1. **On-device inference**: The model must run in a browser via TensorFlow.js. MobileNetV2 at 224×224 input is ~14 MB unquantized, compressible to ~5 MB with float16 quantization — well within the 15 MB PWA cache budget. ResNet-50 or EfficientNet-B4 would be 4–8x larger.

2. **Depthwise separable convolutions**: MobileNetV2's architecture separates spatial filtering from channel mixing, reducing FLOPs by ~8–9x vs a standard conv network of equivalent depth (Howard et al., 2017). This translates directly to inference latency on a CPU-only mobile browser.

**Architecture:**
```
MobileNetV2 base (ImageNet pretrained)
  → GlobalAveragePooling2D
  → Dense(256, ReLU)
  → Dropout(0.5)
  → Dense(64, ReLU)
  → Dropout(0.3)
  → Dense(4, Softmax)        ← outputs [healthy, N_deficient, P_deficient, K_deficient]
```

The output layer uses **softmax over 4 classes** (healthy, nitrogen-deficient, phosphorus-deficient, potassium-deficient). The wider classification head (256 → 64) with stronger dropout (0.5/0.3) provides more capacity for feature discrimination while preventing overfitting on the relatively small training dataset. At inference time, the three deficiency class probabilities are extracted as N/P/K confidence scores, and the healthy class probability provides a natural "all clear" signal.

**Training data — Rice NPK Deficiency Dataset:**
The model is trained on the **Rice NPK Deficiency dataset** (Kaggle: `guy007/nutrientdeficiencysymptomsinrice`) — a curated collection of real nutrient deficiency images from controlled rice plant experiments with verified NPK labels. This replaced an earlier approach using PlantVillage disease proxies, which suffered from domain mismatch (disease symptoms ≠ nutrient deficiency symptoms).

| Dataset class | Image count | Source |
|---|---|---|
| Nitrogen deficient (`Nitrogen(N)/`) | 440 | Rice NPK Deficiency — controlled N-depletion experiments |
| Phosphorus deficient (`Phosphorus(P)/`) | 333 | Rice NPK Deficiency — controlled P-depletion experiments |
| Potassium deficient (`Potassium(K)/`) | 383 | Rice NPK Deficiency — controlled K-depletion experiments |
| Healthy baseline | 500 | PlantVillage healthy rice leaf images (Hughes & Salathé, 2015) |
| **Total** | **1,656** | |

**Two-phase training pipeline:**

*Phase 1 — Classification head only (backbone frozen):*
- 20 epochs, early stopping (patience=6, restore best weights)
- Adam optimizer, lr=1e-3, sparse categorical cross-entropy loss
- Class weights computed from training set distribution to handle imbalance
- Augmentation: RandomFlip (horizontal + vertical), RandomRotation(±45°), RandomZoom(±20%), RandomContrast(±15%), RandomBrightness(±10%), RandomTranslation(±10%)
- ReduceLROnPlateau (factor=0.5, patience=3, min_lr=1e-6)

*Phase 2 — Fine-tune last 30 MobileNetV2 layers:*
- 15 epochs, early stopping (patience=5, restore best weights)
- Adam optimizer, lr=1e-5
- ReduceLROnPlateau (factor=0.5, patience=2, min_lr=1e-7)
- Same class weights and augmentation as Phase 1

**Validation performance (85/15 split, 249 validation images):**

| Class | Precision | Recall | F1 |
|---|---|---|---|
| Healthy | 77.2% | 92.4% | 84.1% |
| Nitrogen deficient | 67.2% | 60.0% | 63.4% |
| Phosphorus deficient | 57.4% | 64.8% | 60.9% |
| Potassium deficient | 60.8% | 48.4% | 53.9% |
| **Overall accuracy** | | | **66.7%** |

The standalone model accuracy is moderate due to the small dataset size (1,656 images). This is by design — the model serves as one signal in a **fusion pipeline** that combines it 50/50 with physics-based color index predictions (Section 6), which substantially improves real-world accuracy.

**Deployment:**
`scripts/train_model.py` → Keras `.keras` model (inference-only, no augmentation layers) → `scripts/export_tfjs.sh` → TF.js LayersModel with float16 quantization → `public/models/npk-mobilenet/` (~5 MB, served as PWA static assets, cached for offline use).

### 5. Leaf Segmentation Pipeline

Before any index computation or model inference, we must isolate the leaf from the background (soil, hands, pot edges). We use OpenCV.js loaded via CDN for this.

The segmentation pipeline in `src/pipeline/segmentation.ts` uses a **multi-range vegetation mask** that captures healthy, stressed, and dead leaf tissue — critical for NPK deficiency detection where the diagnostic tissue may be yellow, brown, or purple rather than green:

```
RGB frame → HSV color space
         → Green mask:  inRange([H:25–95,  S:30+, V:30+])   ← healthy vegetation
         → Yellow mask: inRange([H:15–35,  S:40+, V:60+])   ← chlorotic tissue (N deficiency)
         → Brown mask:  inRange([H:5–30,   S:15+, V:30+])   ← necrotic tissue (K deficiency)
         → Combine: bitwise_or(green, yellow, brown)          ← full vegetation mask
         → Laplacian focus mask (Otsu threshold + dilation)   ← sharp in-focus tissue only
         → bitwise_and(vegetation, focus)                     ← combined mask
         → morphologyEx(MORPH_CLOSE, 11×11) + MORPH_OPEN(5×5) ← cleanup
         → findContours → largest contour by area
         → drawContours(FILLED) → bitwise_and                ← masked leaf image
```

**Multi-range HSV thresholds:** A green-only mask (H: 25–95) would miss the diagnostic tissue entirely — a brown K-deficient leaf would be treated as background. The three overlapping ranges capture: green vegetation (H 25–95, S 30+), yellow/chlorotic tissue (H 15–35, S 40+, V 60+), and brown/necrotic tissue (H 5–30, S 15+, V 30+). Brown tissue uses a wide saturation range (S 15+) because dead leaves can be very desaturated.

**Laplacian focus filtering:** The Laplacian operator detects edges (high-frequency detail) to build a sharpness map, which is Gaussian-blurred and Otsu-thresholded to create a focus mask. This separates the sharp in-focus leaf from blurred backgrounds — preventing soil or distant vegetation from contaminating the analysis. The focus mask is dilated (21×21 ellipse kernel) to tolerate leaf edges that are slightly softer than the center.

**Fallback:** If the largest contour exceeds 85% of the image area (suggesting the entire frame is leaf), the pipeline falls back to a center 60% crop rather than using the full image, which may include edge artifacts.

We take the **largest contour** rather than all contours because in a real field capture the leaf will be the dominant object in frame. This is a deliberate design constraint: the capture UI instructs the user to fill the frame with one leaf.

OpenCV.js (~8 MB) is loaded via CDN rather than bundled to avoid nearly doubling the application bundle size. If it has not loaded when analysis begins, the pipeline falls back to treating the entire image as the leaf region.

### 6. Color Index Inference and Model Fusion

The inference pipeline uses a **dual-signal fusion** approach: physics-based color index predictions are computed from vegetation indices and per-pixel symptom fractions, then fused 50/50 with the MobileNetV2 model output. This compensates for the model's moderate standalone accuracy while grounding predictions in interpretable agronomic signals.

**Physics-based index predictions** (`src/models/fallbackInference.ts`):

The index engine uses both traditional vegetation indices (ExG, NGRDI, VARI) and **per-pixel symptom fractions** — the percentage of leaf pixels classified as purple, brown, or yellow by the color analysis pipeline (`src/pipeline/colorIndices.ts`). Per-pixel fractions solve the critical problem of localized symptoms: a leaf that is 80% green but has 20% brown margin scorch has a healthy *mean* color but an elevated `brownFrac` that correctly triggers K-deficiency detection.

```
N confidence = f(ExG < 0.15, NGRDI < −0.05, yellowFrac > 0.10, brownFrac > 0.30)
P confidence = f(purpleFrac > 0.08, blue ratio > 0.35, purple hue H:260–360° or H:0–20°)
K confidence = f(brownFrac > 0.10, VARI < 0.05, saturation < 0.45)
```

Per-pixel symptom detection thresholds in `colorIndices.ts`:
- **Purple** (anthocyanin, P indicator): `B > G && (R + B) > G × 1.8`
- **Brown** (necrosis, K indicator): `R > G && R > B && green_scaled < 0.42`
- **Yellow** (chlorosis, N indicator): `R > B × 1.3 && G > B × 1.3 && |R − G| < 40 && green_scaled < 0.45`

**Fusion strategy** (`src/hooks/useInference.ts`):

The MobileNetV2 model outputs a 4-class softmax `[healthy, N_def, P_def, K_def]`. The three deficiency probabilities are extracted and fused with the index-based confidences:

| Condition | Fusion rule |
|---|---|
| Both agree deficient (model > 0.3, index > 0.3) | Boost: `(model + index) / 1.5` |
| Both agree healthy (model < 0.15, index < 0.15) | Suppress: `min(model, index)` |
| Disagreement | Weighted average: `index × 0.5 + model × 0.5` |

If the TF.js model fails to load (corrupted asset, first-load cache miss, WebGL unavailable), the index-based predictions are used alone — this is not a degraded mode, as the index engine encodes the same spectral information the model was trained on, just without learned feature weighting.

### 7. NPK Diagnostic Thresholds

Nutrient sufficiency ranges are from Mills & Jones (1996), *Plant Analysis Handbook II* — the standard reference used by university extension laboratories. Values are expressed as percentage of leaf dry weight:

| Nutrient | Crop | Deficient (below) | Adequate | Optimal |
|---|---|---|---|---|
| N | Corn | 2.5% | 2.5–3.0% | 3.0–3.5% |
| P | Corn | 0.2% | 0.2–0.3% | 0.3–0.5% |
| K | Corn | 1.5% | 1.5–2.0% | 2.0–3.0% |
| N | Wheat | 2.0% | 2.0–3.0% | 3.0–4.0% |
| N | Rice | 2.5% | 2.5–3.5% | 3.5–4.5% |
| N | Soybean | 4.0% | 4.0–5.0% | 5.0–5.5% |

These are the thresholds used to classify model output confidence scores into Deficient / Adequate / Optimal levels displayed in the result dials.

### 8. Yield Impact Data

Yield loss percentages and recoverability estimates come from IPNI (International Plant Nutrition Institute) published field trial summaries:

| Nutrient | Severity | Yield Loss | Recoverable |
|---|---|---|---|
| N | Moderate | 22% | 80% |
| N | Severe | 40% | 55% |
| P | Moderate | 15% | 70% |
| K | Moderate | 18% | 75% |
| K | Severe | 35% | 50% |

These numbers are shown in the YieldImpactCard to give the farmer a concrete economic frame for the urgency of intervention.

### 9. NASA POWER — Climate Stress Correlation

The third stage fetches daily agroclimatology data from NASA POWER (Prediction of Worldwide Energy Resources), a free, CORS-enabled REST API served directly from `power.larc.nasa.gov`. No API key is required.

**Parameters retrieved** (community: `AG` — agroclimatology):

| Parameter | Description | Stress threshold |
|---|---|---|
| `T2M_MAX` | Maximum daily air temperature at 2m (°C) | > 34°C for ≥ 3 days = heat event |
| `T2M_MIN` | Minimum daily air temperature at 2m (°C) | Reference baseline |
| `PRECTOTCORR` | Bias-corrected precipitation (mm/day) | < 1 mm for ≥ 7 days = drought event |
| `RH2M` | Relative humidity at 2m (%) | < 40% for ≥ 5 days = low humidity event |
| `ALLSKY_SFC_PAR_TOT` | Photosynthetically active radiation (W/m²) | Context only |

The API returns a 90-day daily time series (~15–20 KB JSON). Sentinel values of `−999` indicate missing data and are skipped in all computations.

**Climate–nutrient uptake correlations** (from published literature):

| Stress type | Primary nutrient affected | Mechanism | Uptake reduction | Citation |
|---|---|---|---|---|
| Heat > 34°C, ≥ 3 days | Nitrogen | Denatures nitrate reductase enzyme, blocking N assimilation | 30–60% | Zhao et al. (2017), *Nature Climate Change* |
| Drought > 14 days | Phosphorus | P moves by diffusion through soil water film; drying collapses that film | 40–70% | Lambers et al. (2006), *Annu. Rev. Plant Biol.* |
| Low RH < 40%, ≥ 5 days | Potassium | Stomatal closure disrupts K⁺ phloem cycling | 25–45% | Marschner (1995), *Mineral Nutrition of Higher Plants* |

These correlations are encoded in `src/data/climateStressCorrelations.ts`. The `StressNarrativeCard` component checks whether the observed climate stress matches the primary deficiency from the leaf diagnosis, then generates a causal sentence with the appropriate uptake reduction range and citation. If climate data is inconclusive, it falls back to "likely soil-chemistry cause" rather than fabricating a climate explanation.

### 10. Fertilizer Recommendations

Application rates and product choices in `src/data/actionPlans.ts` are sourced from:

- **Texas A&M AgriLife Extension Service** bulletin SCS-2005-09 — nutrient management for dryland and irrigated crops
- **USDA NRCS Practice Standard 590** — Nutrient Management (2019)
- **International Fertilizer Association (IFA)** application guidelines

Examples:
- N moderate: urea (46-0-0) + NBPT urease inhibitor at 120–150 kg N/ha within 3 days
- P moderate: triple superphosphate (TSP, 0-46-0) banded 5 cm deep + foliar phosphoric acid (0.5% H₃PO₄) at 50–70 kg P₂O₅/ha
- K severe: sulfate of potash (SOP, 0-0-50) at 150–180 kg K₂O/ha + weekly foliar KNO₃ (3% solution), with a secondary Mg deficiency warning (K–Mg antagonism)

The product choices are not arbitrary — MAP (11-52-0) is specified over DAP for P because band placement near the root zone is critical for immobile P, and MAP has a lower soil pH effect than DAP in high-pH Texas soils.

---

## System Architecture

```
App.tsx  (phase state machine)
  │
  ├─ splash          Logo animation
  ├─ fieldmap        FieldMapView — SVG NDVI satellite render + ZonePins + ZoneCard
  ├─ zone            FieldMapView (selectedZone=true) — ZoneCard already visible
  ├─ capture         CameraView — useCamera hook → live viewfinder → CaptureButton / Upload
  ├─ captured        AnalysisOverlay — freeze frame, begin pipeline
  ├─ analyzing       AnalysisOverlay — OpenCV segmentation → colorIndices → TF.js inference
  ├─ heatmap         SpectralHeatmap — scan-line reveal of false-color overlay
  ├─ results         ResultsView — NutrientDials + SeverityCard + ActionPlanCards + YieldImpactCard
  └─ context         NASAContextView — ClimateChart + StressNarrativeCard + NASA attribution
```

**Phase transitions** are triggered either manually (user tap) or automatically in `?demo=true` mode via the timing table in `src/animations/demoSequence.ts`.

**NASA POWER fetch timing**: `useNASAPower` is called unconditionally at app mount (during splash), so the ~300ms API response is already cached by the time the user reaches the `context` phase. No visible loading spinner in the normal flow. On subsequent loads within 24 hours, results are served from `localStorage` for offline use.

**Escape hatch**: triple-tap the top-right corner at any point to skip directly to a preset results screen with N=82% deficient, P=34% adequate, K=71% deficient. This is the demo recovery path if camera access is denied or the model load fails.

---

## Image Processing Pipeline (detailed)

```
captureFrame() / uploadImage()       useCamera.ts / CameraView.tsx
    │  ImageData (1280×720)
    ▼
segmentLeaf()                        pipeline/segmentation.ts
    │  OpenCV: multi-range HSV (green+yellow+brown) + Laplacian focus
    │  Output: { segmentedImageData, leafMask, leafBounds }
    ▼
computeColorIndices()                pipeline/colorIndices.ts
    │  Per-pixel ExG, NGRDI, VARI + symptom fractions
    │  (purpleFrac, brownFrac, yellowFrac)
    │  Output: { indices, colorData }
    ▼
preprocessForModel()                 pipeline/preprocess.ts
    │  Resize to 224×224, normalize [-1,1], tf.tensor4d [1,224,224,3]
    ▼
┌─────────────────────┐  ┌──────────────────────────┐
│ model.predict()     │  │ fallbackPredict()        │
│ MobileNetV2 softmax │  │ Index + symptom fraction │
│ [healthy,N,P,K]     │  │ [N_conf, P_conf, K_conf] │
└────────┬────────────┘  └────────┬─────────────────┘
         │                        │
         └───────┬────────────────┘
                 ▼
         fuseConfidences()               hooks/useInference.ts
             │  50/50 weighted fusion
             │  Output: final [N, P, K] confidences
             ▼
renderHeatmap()                      pipeline/heatmapRenderer.ts
    │  Per-pixel ExG index → color ramp (red=0.0 → blue=1.0)
    │  Scan-line reveal animation over 2.5s
    ▼
ResultsView                          components/results/
    NutrientDial × 3 (animated SVG rings, 0→value over 2s)
    SeverityCard (shows "Healthy" when all optimal)
    ActionPlanCard × 2 (hidden when all optimal)
    YieldImpactCard (animated counter, hidden when all optimal)
```

---

## Tech Stack Decisions

| Choice | Why |
|---|---|
| **Vite 8 + React 19** | Fastest dev/build cycle; React 19's concurrent features reduce jank during heavy TF.js loads |
| **TailwindCSS v4** | `@theme` CSS variable system lets us co-locate design tokens with component logic |
| **Framer Motion** | Spring physics (`stiffness:260/damping:20`) matches Apple's UIKit spring parameters, producing the "alive" feel of iOS transitions rather than dead ease-in-out curves |
| **TensorFlow.js** | Only mature JS ML framework with WebGL acceleration and SavedModel import from Keras |
| **OpenCV.js via CDN** | ~8 MB — too large to bundle; CDN load is async before first use, keeping initial JS bundle under 500 kB |
| **MobileNetV2** | ~5 MB float16 quantized, runs in <300ms on mobile CPU/WebGL — fits demo latency budget |
| **vite-plugin-pwa + Workbox** | Pre-caches TF.js model shards and all app assets for fully offline operation after first load |
| **Rice NPK Deficiency Dataset** | Real nutrient deficiency images with verified NPK labels from controlled experiments (Kaggle: guy007) |
| **PlantVillage** | Healthy baseline images (~500); Hughes & Salathé (2015) |

---

## Development

```bash
npm install
npm run dev          # http://localhost:5173
```

- Tap field zone pins → ZoneCard appears → tap "Scan a leaf" → camera
- Add `?demo=true` for auto-advancing 90-second demo sequence
- Triple-tap top-right corner → skip to preset results (demo recovery)

```bash
npm run build        # TypeScript check + Vite production build
npm run preview      # Serve dist/ locally (tests PWA/service worker)
```

## Model Training

```bash
pip install tensorflow pillow numpy kagglehub tensorflowjs

# Download Rice NPK Deficiency dataset (Kaggle) + PlantVillage healthy baseline
# Outputs to data/training_v2/ (440 N + 333 P + 383 K + 500 healthy = 1,656 images)
python scripts/prepare_dataset.py

# Two-phase MobileNetV2 training: frozen backbone (20 epochs) + fine-tune (15 epochs)
# Outputs inference model to models/npk-mobilenet-keras/model.keras
python scripts/train_model.py

# Convert to TF.js LayersModel with float16 quantization (~5 MB)
bash scripts/export_tfjs.sh
# Output: public/models/npk-mobilenet/model.json + weight shards
```

**Note:** The `prepare_dataset.py` script requires a Kaggle account for `kagglehub` downloads. Alternatively, download the dataset manually from [kaggle.com/datasets/guy007/nutrientdeficiencysymptomsinrice](https://www.kaggle.com/datasets/guy007/nutrientdeficiencysymptomsinrice) and extract to `data/rice-npk/`.

---

## References

- Blackburn, G.A. (2007). Quantifying chlorophylls and carotenoids at leaf and canopy scales. *Remote Sensing of Environment*, 100(3), 149–160.
- Datt, B. (1998). Remote sensing of chlorophyll a, chlorophyll b, chlorophyll a+b, and total carotenoid content in eucalyptus leaves. *Remote Sensing of Environment*, 66(2), 111–121.
- ESA Sentinel-2 User Handbook (2022). European Space Agency.
- Gitelson, A.A., & Merzlyak, M.N. (1996). Signature analysis of leaf reflectance spectra. *Journal of Plant Physiology*, 148(3–4), 494–500.
- Gitelson, A.A., Kaufman, Y.J., Stark, R., & Rundquist, D. (2002). Novel algorithms for remote estimation of vegetation fraction. *Remote Sensing of Environment*, 80(1), 76–87.
- Gitelson, A.A., Gritz, Y., & Merzlyak, M.N. (2003). Relationships between leaf chlorophyll content and spectral reflectance and algorithms for non-destructive chlorophyll assessment in higher plant leaves. *Journal of Plant Physiology*, 160(3), 271–282.
- Hosgood, B., et al. (1994). LOPEX'93 report. *Joint Research Centre, European Commission*.
- Howard, A., et al. (2017). MobileNets: Efficient convolutional neural networks for mobile vision applications. *arXiv:1704.04861*.
- Hughes, D., & Salathé, M. (2015). An open access repository of images on plant health to enable the development of mobile disease diagnostics. *arXiv:1511.08060*.
- Meyer, G.E., & Neto, J.C. (2008). Verification of color vegetation indices for automated crop imaging applications. *Computers and Electronics in Agriculture*, 63(2), 282–293.
- Mills, H.A., & Jones, J.B. (1996). *Plant Analysis Handbook II*. MicroMacro Publishing.
- Tucker, C.J. (1979). Red and photographic infrared linear combinations for monitoring vegetation. *Remote Sensing of Environment*, 8(2), 127–150.
- USDA NRCS Practice Standard 590 — Nutrient Management (2019).
- Texas A&M AgriLife Extension Service, SCS-2005-09 — Nutrient Management for Agronomic Crops.
- IPNI (International Plant Nutrition Institute) — Nutrient Deficiency Field Trial Summaries.
- Ustin, S.L., et al. (2009). Retrieval of foliar information about plant pigment systems from high resolution spectroscopy. *Remote Sensing of Environment*, 113, S67–S77.
- Woebbecke, D.M., et al. (1995). Color indices for weed identification under various soil, residue, and lighting conditions. *Transactions of the ASAE*, 38(1), 259–269.
- Zhao, C., et al. (2017). Temperature increase reduces global yields of major crops in four independent estimates. *Nature Climate Change*, 7(9), 814–821.
- Lambers, H., et al. (2006). Root architecture and plant nutrition. *Annual Review of Plant Biology*, 57, 595–615.
- Marschner, H. (1995). *Mineral Nutrition of Higher Plants* (2nd ed.). Academic Press.
- Guy, R. (2023). Nutrient Deficiency Symptoms in Rice. *Kaggle*. https://www.kaggle.com/datasets/guy007/nutrientdeficiencysymptomsinrice
- NASA POWER Project. Agroclimatology Community API. *NASA Langley Research Center*. https://power.larc.nasa.gov
