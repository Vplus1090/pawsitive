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
  await ensureRealisticStreetSeed();
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

  const animals = [
    [1, 'Sheru', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600', 28.6304, 77.3721, 1],
    [2, 'Whiskers', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600', 28.6291, 77.3698, 1],
    [3, 'Gauri', 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600', 28.6335, 77.3750, 2],
    [1, 'Bruno', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', 28.6280, 77.3710, 3],
    [5, 'Pip', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600', 28.6318, 77.3734, 3],
    [6, 'Cheeku', 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=600', 28.6350, 77.3680, 2]
  ];
  await getPool().query(
    'INSERT INTO Animals (species_id, nickname, photo_url, latitude, longitude, first_captured_by) VALUES ?',
    [animals]
  );

  const captures = [
    [1, 1, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600', 'Dog', 0.98],
    [1, 2, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600', 'Cat', 0.96],
    [2, 3, 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600', 'Cow', 0.94],
    [3, 4, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', 'Dog', 0.99],
    [3, 5, 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600', 'Bird', 0.92],
    [2, 6, 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=600', 'Monkey', 0.95]
  ];
  await getPool().query(
    'INSERT INTO Captures (user_id, animal_id, photo_url, predicted_species, confidence) VALUES ?',
    [captures]
  );

  const listings = [
    [
      1, 1, 'feed',
      'Sheru looks hungry and weak near JIIT Gate 1. Seeking someone to provide fresh food and clean water bowl.',
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
      28.6304, 77.3721, 'open', null, null
    ],
    [
      2, 3, 'shelter',
      'Gauri the cow is stranded in heavy rain near Sector 62 roundabout. Temporary dry tarp shelter needed.',
      'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600',
      28.6335, 77.3750, 'open', null, null
    ],
    [
      3, 4, 'vaccine',
      'Bruno is scheduled for annual anti-rabies drive this weekend. Need volunteer car to coordinate with Noida Authority vet clinic.',
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600',
      28.6280, 77.3710, 'open', null, null
    ],
    [
      3, null, 'clothes',
      'Three newborn indie puppies shivering in chilly morning breeze near Sector 63 metro station. Warm dog jackets/blankets requested!',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600',
      28.6270, 77.3820, 'open', null, null
    ],
    [
      1, null, 'rescue',
      'Injured stray cat with limp left paw spotted near Fortis Hospital corner. Needs gentle capture and clinic transport.',
      'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600',
      28.6189, 77.3725, 'open', null, null
    ],
    [
      2, 2, 'feed',
      'Whiskers needed kitten milk formula and dry kibble behind the college canteen.',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
      28.6291, 77.3698, 'resolved',
      'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600',
      1
    ]
  ];
  await getPool().query(
    `INSERT INTO Listings (user_id, animal_id, help_type, description, photo_url, latitude, longitude, status, resolved_photo_url, resolved_by)
     VALUES ?`,
    [listings]
  );

  const comments = [
    [1, 2, 'I can bring a bowl of rice and boiled eggs at 2 PM after class!'],
    [1, 1, 'Awesome Kunal! He usually rests under the neem tree near Gate 1.'],
    [1, 3, 'I left a fresh water bowl right next to the security cabin as well.'],
    [2, 3, 'Called the local gaushala team; they dispatched a volunteer van.'],
    [4, 1, 'I have two old sweaters we can turn into cozy puppy blankets.']
  ];
  await getPool().query('INSERT INTO Comments (listing_id, user_id, text) VALUES ?', [comments]);

  const deeds = [
    [1, 1, 'create_listing', 50],
    [1, null, 'capture_animal', 30],
    [1, null, 'capture_animal', 30],
    [1, 6, 'resolve_listing', 100],
    [1, 5, 'create_listing', 50],
    [1, 1, 'post_comment', 10],
    [1, 4, 'post_comment', 10],
    [2, 2, 'create_listing', 50],
    [2, 6, 'create_listing', 50],
    [2, null, 'capture_animal', 30],
    [2, null, 'capture_animal', 30],
    [2, 1, 'post_comment', 10],
    [3, 3, 'create_listing', 50],
    [3, 4, 'create_listing', 50],
    [3, null, 'capture_animal', 30],
    [3, null, 'capture_animal', 30],
    [3, 1, 'post_comment', 10],
    [3, 2, 'post_comment', 10]
  ];
  await getPool().query(
    'INSERT INTO Deeds (user_id, listing_id, action_type, points_awarded) VALUES ?',
    [deeds]
  );

  const userBadges = [
    [1, 1], [1, 2], [1, 4], [1, 5], [1, 7],
    [2, 1], [2, 4],
    [3, 1], [3, 4]
  ];
  await getPool().query('INSERT INTO UserBadges (user_id, badge_id) VALUES ?', [userBadges]);

  await syncUnifiedPoints();
  console.log('✅ Pawsitive MySQL database initialized & seeded successfully.');
  return true;
}

async function ensureRealisticStreetSeed() {
  const countRow = await db.get('SELECT COUNT(*) as count FROM Listings');
  if (countRow && countRow.count >= 10) return;

  const streetAnimals = [
    [1, 'Kaalu', 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&auto=format&fit=crop', 28.6311, 77.3709, 1],
    [2, 'Mithu', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&auto=format&fit=crop', 28.6264, 77.3762, 2],
    [1, 'Chhotu', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop', 28.6342, 77.3691, 3],
    [3, 'Nandi', 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop', 28.6248, 77.3788, 1]
  ];
  await getPool().query(
    'INSERT INTO Animals (species_id, nickname, photo_url, latitude, longitude, first_captured_by) VALUES ?',
    [streetAnimals]
  );

  const streetListings = [
    [
      1, null, 'feed',
      'Fed Kaalu and two street dogs near Sector 62 tea stall with clean water and curd rice tonight.',
      'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&auto=format&fit=crop',
      28.6311, 77.3709, 'resolved',
      'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&auto=format&fit=crop',
      1, 'deed', 100, 1, 0.96, 'AI confirmed Dog & feed deed against original post photo', 100
    ],
    [
      2, null, 'adoption',
      'Friendly ginger street cat Mithu hanging around Shipra Mall parking gate. Litter-trained, looking for a safe home!',
      'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&auto=format&fit=crop',
      28.6264, 77.3762, 'open', null, null,
      'request', 45, 0, null, null, 0
    ],
    [
      3, null, 'feed',
      'Spotted two street dogs resting near Noida Electronic City metro footpath in the afternoon sun.',
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop',
      28.6342, 77.3691, 'open', null, null,
      'photo', 25, 0, null, null, 0
    ],
    [
      1, null, 'rescue',
      'Stray cow Nandi near Fortis crossing has a minor horn scrape. Seeking local gau-raksha vet contact.',
      'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop',
      28.6248, 77.3788, 'open', null, null,
      'request', 70, 0, null, null, 0
    ]
  ];
  await getPool().query(
    `INSERT INTO Listings (
       user_id, animal_id, help_type, description, photo_url, latitude, longitude,
       status, resolved_photo_url, resolved_by, post_kind, post_paw_points,
       ai_verified, ai_verification_score, ai_verification_note, resolved_paw_points
     ) VALUES ?`,
    [streetListings]
  );

  await getPool().query(
    'INSERT INTO Deeds (user_id, listing_id, action_type, points_awarded) VALUES ?',
    [[
      [1, null, 'resolve_listing', 100],
      [2, null, 'create_listing', 45],
      [3, null, 'photo_sighting', 25],
      [1, null, 'create_listing', 70]
    ]]
  );

  await syncUnifiedPoints();
}

export default db;
