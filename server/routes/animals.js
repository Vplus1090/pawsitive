import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const animals = await db.query(`
      SELECT 
        a.*,
        s.name AS species_name,
        s.category AS species_category,
        s.icon AS species_icon,
        u.name AS first_captured_by_name,
        (SELECT COUNT(*) FROM Captures c WHERE c.animal_id = a.animal_id) AS capture_count
      FROM Animals a
      JOIN Species s ON a.species_id = s.species_id
      LEFT JOIN Users u ON a.first_captured_by = u.user_id
      ORDER BY a.created_at DESC
    `);

    return res.json(animals);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch animals' });
  }
});

export default router;
