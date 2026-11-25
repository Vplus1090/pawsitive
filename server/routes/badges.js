import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const badges = await db.query(`
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM UserBadges ub WHERE ub.badge_id = b.badge_id) AS total_earners
      FROM Badges b
      ORDER BY b.points_required ASC
    `);

    return res.json(badges);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

export default router;
