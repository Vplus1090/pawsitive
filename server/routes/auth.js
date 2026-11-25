import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, authMiddleware } from '../auth.js';
import { TRAINER_SPRITE_PRESETS } from '../../shared/trainerSprites.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, location, avatar_url } = req.body;
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').toLowerCase().trim();
    const rawPassword = String(password || '');

    if (cleanName.length < 2 || !cleanEmail.includes('@') || rawPassword.length < 4) {
      return res.status(400).json({
        error: 'Enter a valid name (2+ chars), email, and password (4+ chars)'
      });
    }

    const existing = await db.get('SELECT user_id FROM Users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(rawPassword, salt);
    const avatar = avatar_url?.trim() || TRAINER_SPRITE_PRESETS[0].url;

    const result = await db.run(
      `INSERT INTO Users (name, email, password_hash, location, paw_points, avatar_url)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [cleanName, cleanEmail, password_hash, String(location || '').trim() || 'Sector 62, Noida', avatar]
    );
    const user = await db.get(
      'SELECT user_id, name, email, location, points_total, paw_points, avatar_url FROM Users WHERE user_id = ?',
      [result.insertId]
    );
    const token = signToken(user);

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await db.get('SELECT * FROM Users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Unregistered account. Please create an account.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const safeUser = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      location: user.location,
      points_total: user.points_total,
      paw_points: user.paw_points || 0,
      avatar_url: user.avatar_url
    };

    const token = signToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT user_id, name, email, location, points_total, paw_points, avatar_url, created_at
       FROM Users WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const badges = await db.query(
      `SELECT b.*, ub.earned_at
       FROM UserBadges ub
       JOIN Badges b ON ub.badge_id = b.badge_id
       WHERE ub.user_id = ?
       ORDER BY ub.earned_at DESC`,
      [req.user.user_id]
    );

    const [capturesRow, listingsRow, resolvedRow, deedsRow] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM Captures WHERE user_id = ?', [req.user.user_id]),
      db.get('SELECT COUNT(*) as count FROM Listings WHERE user_id = ?', [req.user.user_id]),
      db.get('SELECT COUNT(*) as count FROM Listings WHERE resolved_by = ?', [req.user.user_id]),
      db.get('SELECT COUNT(*) as count FROM Deeds WHERE user_id = ?', [req.user.user_id])
    ]);

    const stats = {
      captures: capturesRow?.count || 0,
      listings: listingsRow?.count || 0,
      resolved: resolvedRow?.count || 0,
      deeds: deedsRow?.count || 0
    };

    return res.json({ user, badges, stats });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Demo account switcher to easily test different user roles & deeds
router.get('/demo-users', async (req, res) => {
  try {
    const users = await db.query(
      'SELECT user_id, name, email, location, points_total, paw_points, avatar_url FROM Users ORDER BY user_id ASC'
    );
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch demo users' });
  }
});

router.post('/demo-login/:id', async (req, res) => {
  try {
    const user = await db.get(
      'SELECT user_id, name, email, location, points_total, paw_points, avatar_url FROM Users WHERE user_id = ?',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = signToken(user);
    return res.json({ user, token });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to demo login' });
  }
});

export default router;
