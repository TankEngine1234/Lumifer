import { Router } from 'express';
import { getNDVITileUrl } from '../lib/gee-analysis.js';
import { Cache } from '../lib/cache.js';

const router = Router();
const cache = new Cache();

router.get('/', async (req, res) => {
  try {
    const { west, south, east, north } = req.query;
    if (!west || !south || !east || !north) {
      return res.status(400).json({ error: 'Missing bbox params: west, south, east, north' });
    }

    const key = `tiles:${(+west).toFixed(4)},${(+south).toFixed(4)},${(+east).toFixed(4)},${(+north).toFixed(4)}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const tileUrl = await getNDVITileUrl(+west, +south, +east, +north);
    const result = { tileUrl };
    cache.set(key, result);
    res.json(result);
  } catch (err) {
    console.error('Tiles error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
