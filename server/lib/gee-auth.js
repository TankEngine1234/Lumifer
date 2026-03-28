import ee from '@google/earthengine';
import fs from 'fs';

/**
 * Authenticate and initialize Google Earth Engine using a service account.
 * Reads the key file from GEE_KEY_FILE env var (default: ./gee-service-account-key.json).
 */
export async function initGEE() {
  const keyPath = process.env.GEE_KEY_FILE || './gee-service-account-key.json';

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `GEE key file not found at "${keyPath}". ` +
      'Set GEE_KEY_FILE env var or place the key file in server/.'
    );
  }

  const privateKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  await new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(privateKey, resolve, reject);
  });

  await new Promise((resolve, reject) => {
    ee.initialize(null, null, resolve, reject);
  });

  console.log('Earth Engine initialized');
}

export { ee };
