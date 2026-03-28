import { Router } from 'express';
import { analyzeFields } from '../lib/gee-analysis.js';
import { Cache } from '../lib/cache.js';

const router = Router();
const cache = new Cache();

router.get('/', async (req, res) => {
  try {
    const { west, south, east, north } = req.query;
    if (!west || !south || !east || !north) {
      return res.status(400).json({ error: 'Missing bbox params: west, south, east, north' });
    }

    const key = `fields:${(+west).toFixed(4)},${(+south).toFixed(4)},${(+east).toFixed(4)},${(+north).toFixed(4)}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const result = await analyzeFields(+west, +south, +east, +north);
    cache.set(key, result);
    res.json(result);
  } catch (err) {
    console.error('Fields error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
