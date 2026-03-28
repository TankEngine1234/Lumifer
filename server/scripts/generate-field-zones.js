/**
 * One-shot script: run the GEE analysis and write real field data to
 * public/field-zones.json, replacing the placeholder mock rectangles.
 *
 * Usage (from repo root):
 *   cd server && node scripts/generate-field-zones.js
 *
 * Requires GEE_KEY_FILE (or GOOGLE_APPLICATION_CREDENTIALS) in .env
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initGEE } from '../lib/gee-auth.js';
import { analyzeFields } from '../lib/gee-analysis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../public/field-zones.json');

// Imperial Valley — Holtville pure cropland (same as GEE Code Editor script)
const BBOX = { west: -115.39, south: 32.84, east: -115.33, north: 32.89 };

async function main() {
  console.log('Initializing Google Earth Engine...');
  await initGEE();

  console.log(`Running SpectraLag analysis for bbox: [${Object.values(BBOX).join(', ')}]`);
  console.log('This may take 30–90 seconds while GEE processes the imagery...');

  const result = await analyzeFields(BBOX.west, BBOX.south, BBOX.east, BBOX.north);

  const low    = result.fields.filter(f => f.gee_label === 'LOW').length;
  const medium = result.fields.filter(f => f.gee_label === 'MEDIUM').length;
  const high   = result.fields.filter(f => f.gee_label === 'HIGH').length;

  writeFileSync(OUT, JSON.stringify(result, null, 2));

  console.log('\nDone!');
  console.log(`Written ${result.fields.length} fields to public/field-zones.json`);
  console.log(`  LOW    (critical): ${low}`);
  console.log(`  MEDIUM (moderate): ${medium}`);
  console.log(`  HIGH   (healthy):  ${high}`);
  console.log('\nRefresh the web app to see real field boundaries and accurate metrics.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
