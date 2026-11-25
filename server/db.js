import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SPECIES_CATALOG } from './speciesCatalog.js';
import { getResolvePawPoints } from '../shared/pawPoints.js';
import { TRAINER_SPRITE_PRESETS } from '../shared/trainerSprites.js';

// Load .env from project root if present (without requiring extra dependency)
const __dbDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dbDir, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'pawsitive'
};

let pool = null;

function buildPoolOptions() {
  const base = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  if (process.env.DATABASE_URL) {
    const rawUrl = process.env.DATABASE_URL.trim();
    const parsed = new URL(rawUrl);
    const sslMode = parsed.searchParams.get('ssl-mode') || parsed.searchParams.get('sslmode');
    const explicitSsl = parsed.searchParams.get('ssl');

    const needsSsl = Boolean(
      sslMode ||
      explicitSsl ||
      process.env.MYSQL_SSL === 'true' ||
      /aivencloud|tidbcloud|psdb\.cloud|azure\.com/i.test(parsed.hostname)
    );

    return {
      ...base,
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '') || 'test',
      ...(needsSsl ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false } } : {})
    };
  }

  return {
    ...base,
    ...MYSQL_CONFIG,
    ...(process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
  };
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(buildPoolOptions());
  }
  return pool;
}

const db = {
  async query(sql, params = []) {
    const [rows] = await getPool().execute(sql, params);
    return rows;
  },
  async get(sql, params = []) {
    const [rows] = await getPool().execute(sql, params);
    return rows[0] || null;
  },
  async run(sql, params = []) {
    const [result] = await getPool().execute(sql, params);
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
    };
  },
  async transaction(fn) {
    const conn = await getPool().getConnection();
    await conn.beginTransaction();
    try {
      const txDb = {
        async query(sql, params = []) {
          const [rows] = await conn.execute(sql, params);
          return rows;
        },
        async get(sql, params = []) {
          const [rows] = await conn.execute(sql, params);
          return rows[0] || null;
        },
        async run(sql, params = []) {
          const [result] = await conn.execute(sql, params);
          return {
            insertId: result.insertId,
            affectedRows: result.affectedRows
          };
        }
      };
      const out = await fn(txDb);
      await conn.commit();
      return out;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};

export async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    const bootstrapConn = await mysql.createConnection({
      host: MYSQL_CONFIG.host,
      port: MYSQL_CONFIG.port,
      user: MYSQL_CONFIG.user,
      password: MYSQL_CONFIG.password
    });
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${MYSQL_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await bootstrapConn.end();
  }

  // Wave 1: independent tables in parallel
  await Promise.all([
    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        location VARCHAR(255) DEFAULT 'Sector 62, Noida',
        points_total INT DEFAULT 0,
        paw_points INT DEFAULT 0,
        avatar_url MEDIUMTEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `),
    db.run(`
      CREATE TABLE IF NOT EXISTS Species (
        species_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        icon VARCHAR(64) NOT NULL,
        silhouette_icon VARCHAR(64),
        description TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `),
    db.run(`
      CREATE TABLE IF NOT EXISTS Badges (
        badge_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        criteria TEXT NOT NULL,
        icon VARCHAR(64) NOT NULL,
        points_required INT DEFAULT 0,
        badge_type VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  ]);

  // Wave 2: Animals & UserBadges
  await Promise.all([
    db.run(`
      CREATE TABLE IF NOT EXISTS Animals (
        animal_id INT AUTO_INCREMENT PRIMARY KEY,
        species_id INT NOT NULL,
        nickname VARCHAR(150) NOT NULL,
        photo_url MEDIUMTEXT NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        first_captured_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (species_id) REFERENCES Species(species_id) ON DELETE CASCADE,
        FOREIGN KEY (first_captured_by) REFERENCES Users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `),
    db.run(`
      CREATE TABLE IF NOT EXISTS UserBadges (
        user_badge_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        badge_id INT NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (badge_id) REFERENCES Badges(badge_id) ON DELETE CASCADE,
        UNIQUE KEY uniq_user_badge (user_id, badge_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  ]);

  // Wave 3: Captures & Listings
  await Promise.all([
    db.run(`
      CREATE TABLE IF NOT EXISTS Captures (
        capture_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        animal_id INT NOT NULL,
        photo_url MEDIUMTEXT NOT NULL,
        predicted_species VARCHAR(150),
        confidence DOUBLE DEFAULT 0.95,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (animal_id) REFERENCES Animals(animal_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `),
    db.run(`
      CREATE TABLE IF NOT EXISTS Listings (
        listing_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        animal_id INT NULL,
        help_type ENUM('shelter', 'feed', 'clothes', 'vaccine', 'rescue', 'adoption') NOT NULL,
        description TEXT NOT NULL,
        photo_url MEDIUMTEXT NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        status ENUM('open', 'resolved') DEFAULT 'open',
        resolved_photo_url MEDIUMTEXT,
        resolved_by INT NULL,
        post_kind VARCHAR(32) DEFAULT 'request',
        post_paw_points INT DEFAULT 0,
        ai_verified TINYINT(1) DEFAULT 0,
        ai_verification_score DOUBLE,
        ai_verification_note TEXT,
        resolved_paw_points INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (animal_id) REFERENCES Animals(animal_id) ON DELETE SET NULL,
        FOREIGN KEY (resolved_by) REFERENCES Users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  ]);

  // Wave 4: Deeds & Comments
  await Promise.all([
    db.run(`
      CREATE TABLE IF NOT EXISTS Deeds (
        deed_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        listing_id INT NULL,
        action_type VARCHAR(100) NOT NULL,
        points_awarded INT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `),
    db.run(`
      CREATE TABLE IF NOT EXISTS Comments (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        user_id INT NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  ]);

  await ensureSpeciesCatalog();
  const seededNow = await seedData();
  await ensureOnlyRealStreetPosts();
  if (!seededNow && !process.env.VERCEL) {
    await ensureListingDeedColumns();
    await ensureCoreTeamAccounts();
    await ensurePixelUserAvatars();
    await syncUnifiedPoints();
  }
}

async function ensurePixelUserAvatars() {
  const spriteMap = {
    'vardaan@pawsitive.app': TRAINER_SPRITE_PRESETS[0].url,
    'kunal@pawsitive.app': TRAINER_SPRITE_PRESETS[2].url,
    'ripunjay@pawsitive.app': TRAINER_SPRITE_PRESETS[3].url
  };
  const users = await db.query('SELECT user_id, email, avatar_url FROM Users');
  for (const u of users) {
    const url = String(u.avatar_url || '');
    const isStockPhoto = !url || url.includes('images.unsplash.com') || url.includes('api.dicebear.com');
    if (isStockPhoto) {
      const nextSprite = spriteMap[u.email] || TRAINER_SPRITE_PRESETS[(u.user_id - 1) % TRAINER_SPRITE_PRESETS.length].url;
      await db.run('UPDATE Users SET avatar_url = ? WHERE user_id = ?', [nextSprite, u.user_id]);
    }
  }
}

async function syncUnifiedPoints() {
  await db.run(`
    UPDATE Users
    SET points_total = (
      SELECT COALESCE(SUM(points_awarded), 0)
      FROM Deeds
      WHERE Deeds.user_id = Users.user_id
    ),
    paw_points = (
      SELECT COALESCE(SUM(points_awarded), 0)
      FROM Deeds
      WHERE Deeds.user_id = Users.user_id
    )
  `);
}

async function ensureCoreTeamAccounts() {
  const emailMigrations = [
    ['vardaan@jiit.ac.in', 'vardaan@pawsitive.app'],
    ['kunal@jiit.ac.in', 'kunal@pawsitive.app'],
    ['ripunjay@jiit.ac.in', 'ripunjay@pawsitive.app']
  ];
  for (const [oldEmail, newEmail] of emailMigrations) {
    await db.run('UPDATE Users SET email = ? WHERE email = ?', [newEmail, oldEmail]);
  }

  const legacyEmails = ['anya@pawsitive.org', 'rohit@pawsitive.org'];
  const placeholders = legacyEmails.map(() => '?').join(',');
  const legacyUsers = await db.query(
    `SELECT user_id, email FROM Users WHERE email IN (${placeholders})`,
    legacyEmails
  );
  if (legacyUsers.length === 0) return;

  const fallbackUser = await db.get(`SELECT user_id FROM Users WHERE email = 'ripunjay@pawsitive.app'`)
    || await db.get('SELECT user_id FROM Users ORDER BY user_id ASC LIMIT 1');
  if (!fallbackUser) return;

  await db.transaction(async (tx) => {
    for (const lu of legacyUsers) {
      await tx.run('UPDATE Animals SET first_captured_by = ? WHERE first_captured_by = ?', [fallbackUser.user_id, lu.user_id]);
      await tx.run('UPDATE Captures SET user_id = ? WHERE user_id = ?', [fallbackUser.user_id, lu.user_id]);
      await tx.run('UPDATE Listings SET user_id = ? WHERE user_id = ?', [fallbackUser.user_id, lu.user_id]);
      await tx.run('UPDATE Listings SET resolved_by = ? WHERE resolved_by = ?', [fallbackUser.user_id, lu.user_id]);
      await tx.run('UPDATE Comments SET user_id = ? WHERE user_id = ?', [fallbackUser.user_id, lu.user_id]);
      await tx.run('UPDATE Deeds SET user_id = ? WHERE user_id = ?', [fallbackUser.user_id, lu.user_id]);
      await tx.run('DELETE FROM UserBadges WHERE user_id = ?', [lu.user_id]);
      await tx.run('DELETE FROM Users WHERE user_id = ?', [lu.user_id]);
    }
  });
}

async function ensureListingDeedColumns() {
  const resolvedRows = await db.query(`
    SELECT listing_id, help_type, ai_verified, resolved_paw_points
    FROM Listings
    WHERE status = 'resolved'
  `);
  for (const row of resolvedRows) {
    if (!row.ai_verified || !row.resolved_paw_points) {
      await db.run(
        `UPDATE Listings
         SET ai_verified = COALESCE(NULLIF(ai_verified, 0), 1),
             ai_verification_score = COALESCE(ai_verification_score, 0.95),
             ai_verification_note = COALESCE(ai_verification_note, 'AI verified against original listing photo'),
             resolved_paw_points = ?
         WHERE listing_id = ?`,
        [getResolvePawPoints(row.help_type), row.listing_id]
      );
    }
  }
}

async function ensureSpeciesCatalog() {
  const existing = await db.get('SELECT COUNT(*) as count FROM Species');
  if (existing && existing.count >= SPECIES_CATALOG.length) return;

  await getPool().query(
    `INSERT IGNORE INTO Species (name, category, icon, silhouette_icon, description) VALUES ?`,
    [SPECIES_CATALOG]
  );
}

async function seedData() {
  const countRow = await db.get('SELECT COUNT(*) as count FROM Users');
  if (countRow && countRow.count > 0) return false;

  console.log('🌱 Seeding initial Pawsitive MySQL database...');

  const badges = [
    ['First Scout', 'Capture your very first animal', '🎯', 30, 'capture'],
    ['Paws Explorer', 'Capture 3 distinct animals', '🧭', 90, 'capture'],
    ['Paws Master', 'Capture 6 distinct animals', '👑', 180, 'capture'],
    ['Kind Samaritan', 'Post a help listing to alert the community', '🤝', 50, 'listing'],
    ['Guardian Angel', 'Fulfill and resolve an open animal listing', '🛡️', 100, 'resolve'],
    ['Chatty Helper', 'Post 3 helpful coordination comments', '💬', 30, 'comment'],
    ['Top Rescuer', 'Achieve 200+ total deed points', '⭐', 200, 'points']
  ];
  await getPool().query(
    'INSERT INTO Badges (name, criteria, icon, points_required, badge_type) VALUES ?',
    [badges]
  );

  const salt = bcrypt.genSaltSync(10);
  const hashPass = bcrypt.hashSync('pawsitive123', salt);
  const users = [
    ['Vardaan Gahlot', 'vardaan@pawsitive.app', hashPass, 'Sector 62, Noida', 380, TRAINER_SPRITE_PRESETS[0].url],
    ['Kunal Malik', 'kunal@pawsitive.app', hashPass, 'Indirapuram, Ghaziabad', 290, TRAINER_SPRITE_PRESETS[2].url],
    ['Ripunjay Saini', 'ripunjay@pawsitive.app', hashPass, 'Sector 63, Noida', 240, TRAINER_SPRITE_PRESETS[3].url]
  ];
  await getPool().query(
    'INSERT INTO Users (name, email, password_hash, location, points_total, avatar_url) VALUES ?',
    [users]
  );

  // Look up real auto-increment IDs (TiDB Cloud assigns distributed IDs, not always 1,2,3...)
  const [speciesRows, userRows, badgeRows] = await Promise.all([
    db.query("SELECT species_id, name FROM Species WHERE name IN ('Dog', 'Cat', 'Cow', 'Bird', 'Monkey')"),
    db.query('SELECT user_id, email FROM Users ORDER BY user_id ASC'),
    db.query('SELECT badge_id, name FROM Badges ORDER BY badge_id ASC')
  ]);
  const sp = Object.fromEntries(speciesRows.map(r => [r.name, r.species_id]));
  const us = Object.fromEntries(userRows.map(r => [r.email, r.user_id]));
  const u1 = us['vardaan@pawsitive.app'] || userRows[0]?.user_id;
  const u2 = us['kunal@pawsitive.app'] || userRows[1]?.user_id || u1;
  const u3 = us['ripunjay@pawsitive.app'] || userRows[2]?.user_id || u1;
  const fallbackSp = sp.Dog || Object.values(sp)[0];

  await seedRealStreetContent();
  console.log('✅ Pawsitive MySQL database initialized & seeded successfully.');
  return true;
}

async function ensureOnlyRealStreetPosts() {
  const studioRow = await db.get(
    "SELECT listing_id FROM Listings WHERE photo_url LIKE '%images.unsplash.com%' OR resolved_photo_url LIKE '%images.unsplash.com%' LIMIT 1"
  );
  const studioAnimal = await db.get(
    "SELECT animal_id FROM Animals WHERE photo_url LIKE '%images.unsplash.com%' LIMIT 1"
  );
  if (!studioRow && !studioAnimal) return;

  await db.run('DELETE FROM Comments');
  await db.run('DELETE FROM Deeds');
  await db.run('DELETE FROM Captures');
  await db.run('DELETE FROM Listings');
  await db.run('DELETE FROM Animals');
  await seedRealStreetContent();
}

async function seedRealStreetContent() {
  const [speciesRows, userRows, badgeRows] = await Promise.all([
    db.query("SELECT species_id, name FROM Species WHERE name IN ('Dog', 'Cat', 'Cow')"),
    db.query('SELECT user_id, email FROM Users ORDER BY user_id ASC'),
    db.query('SELECT badge_id, name FROM Badges ORDER BY badge_id ASC')
  ]);
  if (userRows.length === 0 || speciesRows.length === 0) return;

  const sp = Object.fromEntries(speciesRows.map(r => [r.name, r.species_id]));
  const us = Object.fromEntries(userRows.map(r => [r.email, r.user_id]));
  const u1 = us['vardaan@pawsitive.app'] || userRows[0].user_id;
  const u2 = us['kunal@pawsitive.app'] || userRows[1]?.user_id || u1;
  const u3 = us['ripunjay@pawsitive.app'] || userRows[2]?.user_id || u1;
  const fallbackSp = sp.Dog || speciesRows[0].species_id;

  const PHOTOS = {
    kaalu: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/An_Indian_Street_Dog.jpg/960px-An_Indian_Street_Dog.jpg',
    sheru: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/The_Indian_Pariah_Dog.jpg/960px-The_Indian_Pariah_Dog.jpg',
    chhotu: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Indian_pariah_dog_sleeping.jpg/960px-Indian_pariah_dog_sleeping.jpg',
    motu: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/A_stray_Indian_Pariah_Dog.jpg/960px-A_stray_Indian_Pariah_Dog.jpg',
    gauri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Cow_in_Varanasi_street_%288527193622%29.jpg/960px-Cow_in_Varanasi_street_%288527193622%29.jpg',
    herd: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/India_-_Delhi_-_009_-_cows_hanging_out_on_the_road_%282129391055%29.jpg/960px-India_-_Delhi_-_009_-_cows_hanging_out_on_the_road_%282129391055%29.jpg',
    mithu: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Stray_cat_standing_in_the_street.JPG/960px-Stray_cat_standing_in_the_street.JPG',
    kaluwaCat: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/A_street_cat.jpg/960px-A_street_cat.jpg'
  };

  const animals = [
    [sp.Dog || fallbackSp, 'Kaalu', PHOTOS.kaalu, 28.6311, 77.3709, u1],
    [sp.Dog || fallbackSp, 'Sheru', PHOTOS.sheru, 28.6304, 77.3721, u1],
    [sp.Cow || fallbackSp, 'Gauri', PHOTOS.gauri, 28.6248, 77.3788, u2],
    [sp.Cat || fallbackSp, 'Mithu', PHOTOS.mithu, 28.6264, 77.3762, u2],
    [sp.Cat || fallbackSp, 'Whiskers', PHOTOS.kaluwaCat, 28.6291, 77.3698, u2],
    [sp.Dog || fallbackSp, 'Chhotu', PHOTOS.chhotu, 28.6342, 77.3691, u3],
    [sp.Cow || fallbackSp, 'Nandi', PHOTOS.herd, 28.6335, 77.3750, u3],
    [sp.Dog || fallbackSp, 'Motu', PHOTOS.motu, 28.6280, 77.3710, u3]
  ];
  await getPool().query(
    'INSERT INTO Animals (species_id, nickname, photo_url, latitude, longitude, first_captured_by) VALUES ?',
    [animals]
  );

  const animalRows = await db.query('SELECT animal_id, nickname FROM Animals ORDER BY animal_id ASC');
  const an = Object.fromEntries(animalRows.map(r => [r.nickname, r.animal_id]));

  // Register every street animal into the corresponding user's Pokédex
  const captures = [
    [u1, an.Kaalu, PHOTOS.kaalu, 'Dog', 0.98],
    [u1, an.Sheru, PHOTOS.sheru, 'Dog', 0.97],
    [u1, an.Gauri, PHOTOS.gauri, 'Cow', 0.95],
    [u2, an.Gauri, PHOTOS.gauri, 'Cow', 0.96],
    [u2, an.Mithu, PHOTOS.mithu, 'Cat', 0.96],
    [u2, an.Whiskers, PHOTOS.kaluwaCat, 'Cat', 0.95],
    [u3, an.Chhotu, PHOTOS.chhotu, 'Dog', 0.97],
    [u3, an.Nandi, PHOTOS.herd, 'Cow', 0.94],
    [u3, an.Motu, PHOTOS.motu, 'Dog', 0.96]
  ];
  await getPool().query(
    'INSERT INTO Captures (user_id, animal_id, photo_url, predicted_species, confidence) VALUES ?',
    [captures]
  );

  const listings = [
    [
      u1, an.Kaalu, 'feed',
      'Fed Kaalu, a brown-and-white Indian street dog waiting by the Sector 62 roadside, with fresh water and rice tonight.',
      PHOTOS.kaalu,
      28.6311, 77.3709, 'resolved',
      PHOTOS.kaalu,
      u1, 'deed', 100, 1, 0.96, 'AI confirmed Dog & feed deed against original post photo', 100
    ],
    [
      u1, an.Sheru, 'feed',
      'Brown Indian Pariah dog Sheru standing alert on the dirt lane near JIIT Gate 1. Needs clean water bowl and dry kibble.',
      PHOTOS.sheru,
      28.6304, 77.3721, 'open', null, null,
      'request', 40, 0, null, null, 0
    ],
    [
      u2, an.Gauri, 'rescue',
      'White street cow Gauri standing in the narrow market lane near Fortis crossing with a minor horn scrape. Seeking local vet check.',
      PHOTOS.gauri,
      28.6248, 77.3788, 'open', null, null,
      'request', 70, 0, null, null, 0
    ],
    [
      u2, an.Mithu, 'adoption',
      'Tabby stray cat Mithu standing on the asphalt street near Shipra Mall gate. Calm and looking for a safe home!',
      PHOTOS.mithu,
      28.6264, 77.3762, 'open', null, null,
      'request', 45, 0, null, null, 0
    ],
    [
      u2, an.Whiskers, 'feed',
      'Fed street cat Whiskers resting outdoors behind the college canteen with warm milk and kibble.',
      PHOTOS.kaluwaCat,
      28.6291, 77.3698, 'resolved',
      PHOTOS.kaluwaCat,
      u2, 'deed', 100, 1, 0.95, 'AI confirmed Cat & feed deed against original post photo', 100
    ],
    [
      u3, an.Chhotu, 'feed',
      'Tan Indian Pariah dog Chhotu curled up sleeping peacefully on the sandy ground near Noida Electronic City metro.',
      PHOTOS.chhotu,
      28.6342, 77.3691, 'open', null, null,
      'photo', 25, 0, null, null, 0
    ],
    [
      u3, an.Nandi, 'shelter',
      'Stray cows hanging out right in the middle of the Sector 63 road — need reflective collars and safe guiding off traffic.',
      PHOTOS.herd,
      28.6335, 77.3750, 'open', null, null,
      'request', 60, 0, null, null, 0
    ],
    [
      u3, an.Motu, 'vaccine',
      'Indian Pariah dog Motu spotted inside the Sector 62 residential complex lane. Scheduled for annual anti-rabies vaccination.',
      PHOTOS.motu,
      28.6280, 77.3710, 'open', null, null,
      'request', 55, 0, null, null, 0
    ]
  ];
  await getPool().query(
    `INSERT INTO Listings (
       user_id, animal_id, help_type, description, photo_url, latitude, longitude,
       status, resolved_photo_url, resolved_by, post_kind, post_paw_points,
       ai_verified, ai_verification_score, ai_verification_note, resolved_paw_points
     ) VALUES ?`,
    [listings]
  );

  const listingRows = await db.query('SELECT listing_id FROM Listings ORDER BY listing_id ASC');
  const l = listingRows.map(r => r.listing_id);

  const comments = [
    [l[1], u2, 'I can bring a bowl of rice and boiled eggs at 2 PM after class!'],
    [l[1], u1, 'Awesome Kunal! He usually rests under the neem tree near Gate 1.'],
    [l[2], u3, 'Called the local gaushala vet team; they can check on her this evening.'],
    [l[6], u1, 'We have two reflective collars left from last weekend drive!']
  ];
  await getPool().query('INSERT INTO Comments (listing_id, user_id, text) VALUES ?', [comments]);

  const deeds = [
    [u1, l[0], 'resolve_listing', 100],
    [u1, l[1], 'create_listing', 40],
    [u1, null, 'capture_animal', 30],
    [u1, null, 'capture_animal', 30],
    [u1, null, 'capture_animal', 30],
    [u1, l[1], 'post_comment', 10],
    [u1, l[6], 'post_comment', 10],
    [u2, l[2], 'create_listing', 70],
    [u2, l[3], 'create_listing', 45],
    [u2, l[4], 'resolve_listing', 100],
    [u2, null, 'capture_animal', 30],
    [u2, null, 'capture_animal', 30],
    [u2, l[1], 'post_comment', 10],
    [u3, l[5], 'photo_sighting', 25],
    [u3, l[6], 'create_listing', 60],
    [u3, l[7], 'create_listing', 55],
    [u3, null, 'capture_animal', 30],
    [u3, null, 'capture_animal', 30],
    [u3, l[2], 'post_comment', 10]
  ];
  await getPool().query(
    'INSERT INTO Deeds (user_id, listing_id, action_type, points_awarded) VALUES ?',
    [deeds]
  );

  const b = badgeRows.map(r => r.badge_id);
  const userBadges = [
    [u1, b[0]], [u1, b[1]], [u1, b[3]], [u1, b[4]], [u1, b[6]],
    [u2, b[0]], [u2, b[3]], [u2, b[4]],
    [u3, b[0]], [u3, b[3]]
  ].filter(([, bid]) => Boolean(bid));
  if (userBadges.length > 0) {
    await getPool().query('INSERT IGNORE INTO UserBadges (user_id, badge_id) VALUES ?', [userBadges]);
  }

  await syncUnifiedPoints();
}

export default db;
