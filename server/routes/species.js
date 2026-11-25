import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const species = await db.query('SELECT * FROM Species ORDER BY species_id ASC');
    return res.json(species);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch species' });
  }
});

export default router;
