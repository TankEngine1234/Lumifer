import { ee } from './gee-auth.js';

// =====================================================================
// SPECTRALAG v2 — Accuracy-first analysis pipeline
// Changes from v1:
//   1. Most-recent clear image instead of .median() composite
//   2. Sentinel-2 L2A (SR) with SCL cloud/shadow mask
//   3. SWIR-based fallow/dry-soil exclusion on top of CDL
//   4. Tight 5m focal_mean to preserve field edges
//   5. Dynamic thresholds from 3-year historical NDVI baseline
// =====================================================================

/**
 * Cloud + shadow mask using the Scene Classification Layer (SCL) from L2A.
 * SCL classes: 3=cloud shadow, 8=cloud medium, 9=cloud high, 10=cirrus, 11=snow
 * Also masks saturated (1) and dark/unclassified (0,2,6,7)
 */
function maskS2scl(image) {
  const scl = image.select('SCL');
  // Keep only: 4=vegetation, 5=bare soil, 6=water (but we'll mask water separately)
  const clear = scl.eq(4).or(scl.eq(5));
  return image.updateMask(clear).divide(10000);
}

/**
 * Build the analysis base for an AOI.
 *
 * Uses the most recent cloud-free image (< 5% cloud cover) within the
 * last 30 days of the analysis window, falling back to a tight median
 * of the best 5 images if no single clear image is available.
 */
function buildBase(farm) {
  // Full collection — Sentinel-2 Level-2A Surface Reflectance
  const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(farm)
    .filterDate('2023-11-01', '2024-02-28')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
    .map(maskS2scl);

  // Strategy: most recent clear image first, fallback to best-5 median
  const sorted = collection.sort('system:time_start', false); // newest first
  const recentCount = sorted.size();

  // Use the single most recent image if available, otherwise median of best 5
  const image = ee.Algorithms.If(
    recentCount.gt(0),
    ee.Algorithms.If(
      recentCount.lte(3),
      sorted.median().clip(farm),           // very few images — use all
      sorted.limit(5).median().clip(farm)   // take best 5 most recent
    ),
    // Absolute fallback: relax cloud threshold
    ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(farm)
      .filterDate('2023-11-01', '2024-02-28')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
      .map(maskS2scl)
      .median()
      .clip(farm)
  );

  const img = ee.Image(image);

  // ── NDVI with tight smoothing (5m radius — preserves field edges) ──
  const ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI');
  const ndviSmooth = ndvi.focal_mean({ radius: 5, units: 'meters' });

  // ── 3-year historical baseline for dynamic thresholds ──
  const historicalNdvi = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(farm)
    .filterDate('2021-01-01', '2024-01-01')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .filter(ee.Filter.calendarRange(11, 2, 'month')) // same season (Nov–Feb)
    .map(maskS2scl)
    .map(function (i) {
      return i.normalizedDifference(['B8', 'B4']).rename('NDVI');
    });

  const historicalMean = historicalNdvi.mean().rename('hist_mean');
  const historicalStd = historicalNdvi.reduce(ee.Reducer.stdDev()).rename('hist_std');

  // Dynamic thresholds: stressed = below (mean - 1 std), moderate = below (mean - 0.3 std)
  // Clamped to reasonable bounds to avoid extreme values in low-data areas
  const dynamicLow = historicalMean.subtract(historicalStd)
    .max(0.20).min(0.40);   // clamp between 0.20 and 0.40
  const dynamicMed = historicalMean.subtract(historicalStd.multiply(0.3))
    .max(0.40).min(0.60);   // clamp between 0.40 and 0.60

  // ── Smart masking: CDL + SWIR fallow filter + built-up ──

  // A) USDA CDL crop mask
  const cdl = ee.ImageCollection('USDA/NASS/CDL')
    .filterDate('2023-01-01', '2023-12-31')
    .first()
    .select('cropland');
  const cropMask = cdl.lte(61).or(cdl.gte(225).and(cdl.lte(254)));

  // B) SWIR fallow/dry-soil exclusion
  // High B11 (SWIR1) reflectance indicates bare/dry soil, not stressed crops.
  // Threshold: B11 > 0.25 (after /10000 scaling) with low NDVI = fallow, not crop stress
  const swir = img.select('B11');
  const fallowMask = swir.gt(0.25).and(ndvi.lt(0.30)); // high SWIR + low NDVI = dry soil
  const notFallow = fallowMask.not();

  // C) Spectral built-up index
  const ndbi = img.normalizedDifference(['B11', 'B8']);
  const bsi = img.expression(
    '((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))',
    {
      SWIR: img.select('B11'),
      RED: img.select('B4'),
      NIR: img.select('B8'),
      BLUE: img.select('B2'),
    }
  );
  const builtUpMask = ndbi.gt(0.0).and(bsi.gt(0.1));

  // Combined: must be CDL crop AND not fallow AND not built-up
  const farmOnly = cropMask.and(notFallow).and(builtUpMask.not());

  return {
    image: img,
    ndvi,
    ndviSmooth,
    farmOnly,
    dynamicLow,
    dynamicMed,
    historicalMean,
  };
}

/**
 * Analyze fields with dynamic thresholds and improved masking.
 */
export async function analyzeFields(west, south, east, north) {
  const farm = ee.Geometry.Rectangle([west, south, east, north]);
  const { ndviSmooth, farmOnly, dynamicLow, dynamicMed, historicalMean } = buildBase(farm);

  // Segment fields — only active vegetation that passes all masks
  const anyVeg = ndviSmooth.gt(0.20).and(farmOnly);
  const fieldBlobs = anyVeg
    .focal_max({ radius: 10, units: 'meters' })
    .focal_min({ radius: 10, units: 'meters' })
    .focal_max({ radius: 8, units: 'meters' });
  const blobSize = fieldBlobs.selfMask().connectedPixelCount(1024, true);
  const cleanBlobs = fieldBlobs.updateMask(blobSize.gte(10));

  // Vectorize
  const fieldPolygons = cleanBlobs.selfMask().reduceToVectors({
    geometry: farm,
    scale: 10,
    geometryType: 'polygon',
    eightConnected: true,
    maxPixels: 1e9,
    tileScale: 8,
  });

  // Dynamic classification per pixel
  const isLow = ndviSmooth.lt(dynamicLow);
  const isMed = ndviSmooth.gte(dynamicLow).and(ndviSmooth.lt(dynamicMed));
  const isHigh = ndviSmooth.gte(dynamicMed);

  // Stack for reduceRegions: mean NDVI + fraction of each class + greenness ratio
  const greenness = ndviSmooth.divide(historicalMean.max(0.01)).rename('greenness');

  const stacked = ndviSmooth.rename('ndvi')
    .addBands(isLow.rename('low_frac'))
    .addBands(isMed.rename('med_frac'))
    .addBands(isHigh.rename('high_frac'))
    .addBands(greenness);

  const fieldStats = stacked.reduceRegions({
    collection: fieldPolygons,
    reducer: ee.Reducer.mean(),
    scale: 10,
    tileScale: 8,
  });

  // Classify using majority dynamic class + greenness ratio
  const classifiedFields = fieldStats.map(function (f) {
    const meanNdvi = ee.Number(f.get('ndvi'));
    const lowFrac = ee.Number(f.get('low_frac'));
    const medFrac = ee.Number(f.get('med_frac'));
    const greennessRatio = ee.Number(f.get('greenness'));
    const areaHa = f.geometry().area(1).divide(10000);

    // Primary: majority pixel class within the field
    // Secondary: greenness ratio (current / historical) as tiebreaker
    // greenness < 0.7 → performing well below historical = stressed
    // greenness 0.7-0.9 → moderate underperformance
    // greenness > 0.9 → performing near or above historical
    const label = ee.Algorithms.If(
      lowFrac.gt(0.4),  // >40% of pixels are dynamically stressed
      'LOW',
      ee.Algorithms.If(
        medFrac.gt(0.4).or(greennessRatio.lt(0.75)),
        'MEDIUM',
        'HIGH'
      )
    );

    const priority = ee.Number(1.0).subtract(meanNdvi).multiply(10).add(areaHa.min(5));

    return f.set({
      mean_ndvi: meanNdvi,
      area_ha: areaHa,
      label: label,
      priority: priority,
      greenness: greennessRatio,
    });
  });

  // Evaluate and convert to JSON
  const geojson = await new Promise((resolve, reject) => {
    classifiedFields.evaluate((result, error) => {
      if (error) reject(new Error(error));
      else resolve(result);
    });
  });

  const fields = geojson.features.map((feature, i) => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates[0];
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);

    return {
      id: `f-${String(i + 1).padStart(2, '0')}`,
      mean_ndvi: Math.round((props.mean_ndvi || 0) * 1000) / 1000,
      gee_label: props.label || 'HIGH',
      area_ha: Math.round((props.area_ha || 0) * 10) / 10,
      priority: Math.round((props.priority || 0) * 10) / 10,
      greenness: Math.round((props.greenness || 1) * 100) / 100,
      geometry: feature.geometry,
      bounds: [
        Math.round(Math.min(...lngs) * 10000) / 10000,
        Math.round(Math.min(...lats) * 10000) / 10000,
        Math.round(Math.max(...lngs) * 10000) / 10000,
        Math.round(Math.max(...lats) * 10000) / 10000,
      ],
    };
  });

  const centerLng = (west + east) / 2;
  const centerLat = (south + north) / 2;
  const extent = Math.max(east - west, north - south);
  const zoom = extent > 0.05 ? 14 : extent > 0.025 ? 15 : 16;

  return {
    meta: {
      source: 'Sentinel-2 L2A NDVI · USDA CDL · SWIR fallow filter · 3yr baseline',
      region: 'Imperial Valley, CA — Holtville Cropland',
      imagery_period: '2023-11-01 to 2024-02-28',
      generated: new Date().toISOString().split('T')[0],
      gee_script: 'SpectraLag v2 — dynamic thresholds + smart masking',
      crs: 'EPSG:4326',
      farm_bounds: [west, south, east, north],
    },
    center: [centerLng, centerLat],
    zoom,
    fields,
  };
}

/**
 * Get NDVI classified tile URL — uses dynamic thresholds.
 */
export async function getNDVITileUrl(west, south, east, north) {
  const farm = ee.Geometry.Rectangle([west, south, east, north]);
  const { ndviSmooth, farmOnly } = buildBase(farm);

  // Fixed thresholds matching GEE Code Editor (0.25 / 0.35 / 0.55)
  const ndviClassified = ee.Image(0)
    .where(ndviSmooth.gt(0.25).and(ndviSmooth.lte(0.35)), 1)  // LOW → red
    .where(ndviSmooth.gt(0.35).and(ndviSmooth.lte(0.55)), 2)  // MEDIUM → yellow
    .where(ndviSmooth.gt(0.55), 3)                             // HIGH → green
    .updateMask(ndviSmooth.gt(0.25).and(farmOnly));

  const mapInfo = await new Promise((resolve, reject) => {
    ndviClassified.getMapId(
      { min: 1, max: 3, palette: ['FF0000', 'FFFF00', '00CC00'] },
      (result, error) => {
        if (error) reject(new Error(error));
        else resolve(result);
      }
    );
  });

  return mapInfo.urlFormat ||
    `https://earthengine.googleapis.com/v1/${mapInfo.mapid}/tiles/{z}/{x}/{y}`;
}

/**
 * Get RGB satellite tile URL.
 */
export async function getRGBTileUrl(west, south, east, north) {
  const farm = ee.Geometry.Rectangle([west, south, east, north]);
  const { image } = buildBase(farm);

  const mapInfo = await new Promise((resolve, reject) => {
    image.getMapId(
      { min: 0.0, max: 0.3, bands: ['B4', 'B3', 'B2'] },
      (result, error) => {
        if (error) reject(new Error(error));
        else resolve(result);
      }
    );
  });

  return mapInfo.urlFormat ||
    `https://earthengine.googleapis.com/v1/${mapInfo.mapid}/tiles/{z}/{x}/{y}`;
}

/**
 * Get summary statistics.
 */
export async function getStats(fields) {
  const low = fields.filter(f => f.gee_label === 'LOW').length;
  const medium = fields.filter(f => f.gee_label === 'MEDIUM').length;
  const high = fields.filter(f => f.gee_label === 'HIGH').length;
  const meanNdvi = fields.length > 0
    ? fields.reduce((sum, f) => sum + f.mean_ndvi, 0) / fields.length
    : 0;

  return { total: fields.length, low, medium, high, meanNdvi: Math.round(meanNdvi * 1000) / 1000 };
}
