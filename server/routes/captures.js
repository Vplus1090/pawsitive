import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';
import { recordDeed } from '../badgeService.js';
import { SCAN_PAW_POINTS, getScanPawPoints } from '../../shared/pawPoints.js';

const router = express.Router();

// 2 scans per level: 1-2 scans = Lv.1, 3-4 = Lv.2, ..., 99-100 scans = Lv.50
export function computeSpeciesLevel(scanCount) {
  if (!scanCount || scanCount <= 0) return 0;
  return Math.ceil(scanCount / 2);
}

// Shared helper used by both Scan and Post: detects new animal vs new version, adds to Dex, levels up species, and increments PawPoints
export async function recordSpeciesCapture({
  userId,
  speciesId,
  nickname,
  photoUrl,
  latitude = 28.6300,
  longitude = 77.3715,
  predictedSpecies,
  confidence = 0.95,
  basePawPoints = null,
  logDeed = true
}) {
  const species = await db.get('SELECT * FROM Species WHERE species_id = ?', [speciesId]);
  if (!species) {
    throw new Error('Invalid species');
  }

  const prevRow = await db.get(
    `SELECT COUNT(*) as count
     FROM Captures c
     JOIN Animals a ON c.animal_id = a.animal_id
     WHERE c.user_id = ? AND a.species_id = ?`,
    [userId, speciesId]
  );
  const prevSpeciesScans = prevRow?.count || 0;

  const isNewSpecies = prevSpeciesScans === 0;
  const dexStatus = isNewSpecies ? 'new_animal' : 'new_version';
  const finalNickname = nickname?.trim() || `${species.name} #${prevSpeciesScans + 1}`;

  // 1. Create individual Animal version (e.g. Sheru, Bruno) linked to Species (Dog)
  const animalResult = await db.run(
    `INSERT INTO Animals (species_id, nickname, photo_url, latitude, longitude, first_captured_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [speciesId, finalNickname, photoUrl, latitude, longitude, userId]
  );
  const animalId = animalResult.insertId;

  // 2. Create Capture record
  const captureResult = await db.run(
    `INSERT INTO Captures (user_id, animal_id, photo_url, predicted_species, confidence)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, animalId, photoUrl, predictedSpecies || species.name, confidence]
  );

  // 3. Award unified Paw/Deed points via single Deeds ledger
  const pawPointsAwarded = basePawPoints != null
    ? basePawPoints + (isNewSpecies ? SCAN_PAW_POINTS.firstDiscoveryBonus : 0)
    : getScanPawPoints(isNewSpecies);

  const deedRes = logDeed ? await recordDeed(userId, 'capture_animal', pawPointsAwarded) : null;

  const prevLevel = computeSpeciesLevel(prevSpeciesScans);
  const newScanCount = prevSpeciesScans + 1;
  const newSpeciesLevel = computeSpeciesLevel(newScanCount);
  const updatedUser = await db.get('SELECT points_total, paw_points FROM Users WHERE user_id = ?', [userId]);

  return {
    animalId,
    captureId: captureResult.insertId,
    species,
    finalNickname,
    isNewSpecies,
    dexStatus,
    prevSpeciesScans,
    speciesScanCount: newScanCount,
    prevLevel,
    speciesLevel: newSpeciesLevel,
    pawPointsAwarded,
    newTotalPoints: updatedUser.points_total,
    newPawPoints: updatedUser.paw_points,
    newlyUnlockedBadges: deedRes?.newlyUnlockedBadges || []
  };
}

// Scan an animal (ONLY adds to Dex, levels up species, and increments PawPoints)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      nickname,
      species_id,
      photo_url,
      latitude,
      longitude,
      predicted_species,
      confidence
    } = req.body;

    if (!species_id || !photo_url) {
      return res.status(400).json({ error: 'species_id and photo_url are required' });
    }

    const captureMeta = await recordSpeciesCapture({
      userId: req.user.user_id,
      speciesId: species_id,
      nickname,
      photoUrl: photo_url,
      latitude: latitude || 28.6300,
      longitude: longitude || 77.3715,
      predictedSpecies: predicted_species,
      confidence: confidence || 0.95
    });

    const fullCapture = await db.get(
      `SELECT 
         c.capture_id,
         c.timestamp,
         c.predicted_species,
         c.confidence,
         a.animal_id,
         a.nickname,
         a.photo_url,
         a.latitude,
         a.longitude,
         s.species_id,
         s.name AS species_name,
         s.category AS species_category,
         s.icon AS species_icon
       FROM Captures c
       JOIN Animals a ON c.animal_id = a.animal_id
       JOIN Species s ON a.species_id = s.species_id
       WHERE c.capture_id = ?`,
      [captureMeta.captureId]
    );

    return res.status(201).json({
      capture: fullCapture,
      reward: {
        pawPointsAwarded: captureMeta.pawPointsAwarded,
        newTotalPoints: captureMeta.newTotalPoints,
        newPawPoints: captureMeta.newPawPoints,
        isNewSpecies: captureMeta.isNewSpecies,
        dexStatus: captureMeta.dexStatus,
        speciesScanCount: captureMeta.speciesScanCount,
        prevLevel: captureMeta.prevLevel,
        speciesLevel: captureMeta.speciesLevel,
        newlyUnlockedBadges: captureMeta.newlyUnlockedBadges
      }
    });
  } catch (err) {
    if (err.message === 'Invalid species') {
      return res.status(404).json({ error: 'Invalid species' });
    }
    console.error('Capture animal error:', err);
    return res.status(500).json({ error: 'Failed to record capture' });
  }
});

// GET Pokédex Overview for the user (1 entry per Species, leveled by scan count)
router.get('/pokedex', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const allSpecies = await db.query('SELECT * FROM Species ORDER BY species_id ASC');

    const userCaptures = await db.query(
      `SELECT 
         c.capture_id,
         c.timestamp,
         a.animal_id,
         a.nickname,
         a.photo_url,
         a.latitude,
         a.longitude,
         s.species_id,
         s.name AS species_name,
         s.icon AS species_icon
       FROM Captures c
       JOIN Animals a ON c.animal_id = a.animal_id
       JOIN Species s ON a.species_id = s.species_id
       WHERE c.user_id = ?
       ORDER BY c.timestamp DESC`,
      [userId]
    );

    const pokedex = allSpecies.map(sp => {
      const specimens = userCaptures.filter(c => c.species_id === sp.species_id);
      const isCaptured = specimens.length > 0;
      const level = computeSpeciesLevel(specimens.length);
      return {
        species_id: sp.species_id,
        name: sp.name,
        category: sp.category,
        icon: sp.icon,
        silhouette_icon: sp.silhouette_icon,
        description: sp.description,
        isCaptured,
        captureCount: specimens.length,
        level,
        nextLevelScans: level * 2 + 1,
        specimens
      };
    });

    const totalSpecies = allSpecies.length;
    const capturedSpeciesCount = pokedex.filter(p => p.isCaptured).length;
    const completionPercentage = Math.round((capturedSpeciesCount / totalSpecies) * 100);

    return res.json({
      completionPercentage,
      totalSpecies,
      capturedSpeciesCount,
      pokedex
    });
  } catch (err) {
    console.error('Pokedex error:', err);
    return res.status(500).json({ error: 'Failed to fetch pokedex' });
  }
});

// GET user's individual trading cards / scanned versions
router.get('/my-cards', authMiddleware, async (req, res) => {
  try {
    const cards = await db.query(
      `SELECT 
         c.capture_id,
         c.timestamp,
         c.predicted_species,
         c.confidence,
         a.animal_id,
         a.nickname,
         a.photo_url,
         a.latitude,
         a.longitude,
         s.species_id,
         s.name AS species_name,
         s.category AS species_category,
         s.icon AS species_icon
       FROM Captures c
       JOIN Animals a ON c.animal_id = a.animal_id
       JOIN Species s ON a.species_id = s.species_id
       WHERE c.user_id = ?
       ORDER BY c.timestamp DESC`,
      [req.user.user_id]
    );

    return res.json(cards);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

export default router;
