import { Router } from 'express';
import { analyzeFields, getStats } from '../lib/gee-analysis.js';
import { Cache } from '../lib/cache.js';

const router = Router();
const fieldsCache = new Cache();

router.get('/', async (req, res) => {
  try {
    const { west, south, east, north } = req.query;
    if (!west || !south || !east || !north) {
      return res.status(400).json({ error: 'Missing bbox params: west, south, east, north' });
    }

    const key = `fields:${(+west).toFixed(4)},${(+south).toFixed(4)},${(+east).toFixed(4)},${(+north).toFixed(4)}`;
    let fieldsResult = fieldsCache.get(key);
    if (!fieldsResult) {
      fieldsResult = await analyzeFields(+west, +south, +east, +north);
      fieldsCache.set(key, fieldsResult);
    }

    const stats = await getStats(fieldsResult.fields);
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
