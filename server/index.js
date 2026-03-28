import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initGEE } from './lib/gee-auth.js';
import fieldsRouter from './routes/fields.js';
import tilesRouter from './routes/tiles.js';
import rgbTilesRouter from './routes/rgb-tiles.js';
import statsRouter from './routes/stats.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
}));
app.use(express.json());

let eeReady = false;

// Health check — works before GEE init
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', gee: eeReady });
});

// GEE readiness guard — must be before route handlers
app.use('/api', (req, res, next) => {
  if (!eeReady && req.path !== '/health') {
    return res.status(503).json({ error: 'Earth Engine not yet initialized' });
  }
  next();
});

// Mount routes
app.use('/api/fields', fieldsRouter);
app.use('/api/tiles', tilesRouter);
app.use('/api/rgb-tiles', rgbTilesRouter);
app.use('/api/stats', statsRouter);

async function start() {
  try {
    await initGEE();
    eeReady = true;
  } catch (err) {
    console.error('Failed to initialize Earth Engine:', err.message);
    console.error('Server will start but GEE endpoints will return 503.');
    console.error('Ensure GEE_KEY_FILE points to a valid service account key.');
  }

  app.listen(PORT, () => {
    console.log(`SpectraLag API running on http://localhost:${PORT}`);
    if (eeReady) {
      console.log('Earth Engine ready — all endpoints active');
    } else {
      console.log('Earth Engine NOT ready — /api/health will report status');
    }
  });
}

start();
