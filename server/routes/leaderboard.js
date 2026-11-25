import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

// GET ranked leaderboard
router.get('/', authMiddleware, async (req, res) => {
  try {
    const leaderboard = await db.query(`
      SELECT 
        u.user_id,
        u.name,
        u.avatar_url,
        u.location,
        COALESCE(SUM(d.points_awarded), 0) AS total_points,
        COUNT(d.deed_id) AS deeds_count,
        (SELECT COUNT(DISTINCT animal_id) FROM Captures c WHERE c.user_id = u.user_id) AS captures_count,
        (SELECT COUNT(*) FROM Listings l WHERE l.resolved_by = u.user_id) AS rescues_resolved,
        (SELECT COUNT(*) FROM UserBadges ub WHERE ub.user_id = u.user_id) AS badges_count
      FROM Users u
      LEFT JOIN Deeds d ON u.user_id = d.user_id
      GROUP BY u.user_id, u.name, u.avatar_url, u.location
      ORDER BY total_points DESC
    `);

    // Attach user top badges
    const enriched = await Promise.all(
      leaderboard.map(async (user, index) => {
        const topBadges = await db.query(
          `SELECT b.badge_id, b.name, b.icon
           FROM UserBadges ub
           JOIN Badges b ON ub.badge_id = b.badge_id
           WHERE ub.user_id = ?
           LIMIT 3`,
          [user.user_id]
        );

        return {
          rank: index + 1,
          ...user,
          total_points: Number(user.total_points || 0),
          topBadges
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET recent deeds live activity stream
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const activity = await db.query(`
      SELECT 
        d.deed_id,
        d.action_type,
        d.points_awarded,
        d.timestamp,
        u.user_id,
        u.name AS user_name,
        u.avatar_url AS user_avatar,
        l.listing_id,
        l.help_type,
        l.description AS listing_desc
      FROM Deeds d
      JOIN Users u ON d.user_id = u.user_id
      LEFT JOIN Listings l ON d.listing_id = l.listing_id
      ORDER BY d.timestamp DESC
      LIMIT 20
    `);

    return res.json(activity);
  } catch (err) {
    console.error('Activity error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity stream' });
  }
});

export default router;
