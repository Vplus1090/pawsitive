import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import listingsRoutes from './routes/listings.js';
import capturesRoutes from './routes/captures.js';
import speciesRoutes from './routes/species.js';
import animalsRoutes from './routes/animals.js';
import leaderboardRoutes from './routes/leaderboard.js';
import badgesRoutes from './routes/badges.js';
import aiRoutes from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initPromise = null;
export function ensureDbReady() {
  if (!initPromise) {
    initPromise = initDatabase().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure MySQL schema & seed data are ready before handling API requests
app.use('/api', async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error('Database initialization error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Static uploads folder (writable in local dev; skipped on Vercel read-only FS)
const uploadsDir = path.join(__dirname, 'uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/captures', capturesRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Pawsitive API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend production build when running Express standalone
if (!process.env.VERCEL) {
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  await ensureDbReady();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🐾 Pawsitive API Server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
