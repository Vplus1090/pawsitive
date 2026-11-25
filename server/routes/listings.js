import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';
import { recordDeed } from '../badgeService.js';
import { recordSpeciesCapture } from './captures.js';
import { classifySpeciesQuery, classifyPostIntent, verifyDeedPhoto } from './ai.js';
import {
  SIGHTING_PAW_POINTS,
  POST_PAW_POINTS_BY_HELP,
  RESOLVE_PAW_POINTS_BY_HELP,
  getPostPawPoints,
  getResolvePawPoints,
  getPhotoPostPawPoints
} from '../../shared/pawPoints.js';

const router = express.Router();

function enrichListingWithPoints(listing) {
  if (!listing) return listing;
  const isResolved = listing.status === 'resolved';
  const postKind = listing.post_kind || (isResolved ? 'deed' : 'request');
  const resolvePawPoints = listing.resolved_paw_points || getResolvePawPoints(listing.help_type);
  const postPawPoints = listing.post_paw_points || (
    postKind === 'photo' ? getPhotoPostPawPoints(false) : getPostPawPoints(listing.help_type)
  );
  const rewardPawPoints = isResolved
    ? resolvePawPoints
    : (postKind === 'photo' ? postPawPoints : resolvePawPoints);
  return {
    ...listing,
    post_kind: postKind,
    post_paw_points: postPawPoints,
    resolve_paw_points: resolvePawPoints,
    reward_paw_points: rewardPawPoints
  };
}

// GET all listings (with filter & search)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { help_type, status, search } = req.query;

    let query = `
      SELECT 
        l.listing_id,
        l.user_id,
        l.animal_id,
        l.help_type,
        l.description,
        l.photo_url,
        l.latitude,
        l.longitude,
        l.status,
        l.resolved_photo_url,
        l.resolved_by,
        l.post_kind,
        l.post_paw_points,
        l.ai_verified,
        l.ai_verification_score,
        l.ai_verification_note,
        l.resolved_paw_points,
        l.created_at,
        u.name AS poster_name,
        u.avatar_url AS poster_avatar,
        u.location AS poster_location,
        a.nickname AS animal_nickname,
        s.name AS species_name,
        s.icon AS species_icon,
        s.category AS species_category,
        ru.name AS resolver_name,
        ru.avatar_url AS resolver_avatar,
        (SELECT COUNT(*) FROM Comments c WHERE c.listing_id = l.listing_id) AS comment_count
      FROM Listings l
      JOIN Users u ON l.user_id = u.user_id
      LEFT JOIN Animals a ON l.animal_id = a.animal_id
      LEFT JOIN Species s ON a.species_id = s.species_id
      LEFT JOIN Users ru ON l.resolved_by = ru.user_id
      WHERE 1=1
    `;

    const params = [];

    if (help_type && help_type !== 'all') {
      query += ` AND l.help_type = ?`;
      params.push(help_type);
    }

    if (status && status !== 'all') {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (l.description LIKE ? OR a.nickname LIKE ? OR s.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY l.created_at DESC`;

    const listings = (await db.query(query, params)).map(enrichListingWithPoints);
    return res.json(listings);
  } catch (err) {
    console.error('Listings fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET single listing + comments
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await db.get(
      `SELECT 
         l.*,
         u.name AS poster_name,
         u.avatar_url AS poster_avatar,
         u.location AS poster_location,
         a.nickname AS animal_nickname,
         s.name AS species_name,
         s.icon AS species_icon,
         ru.name AS resolver_name,
         ru.avatar_url AS resolver_avatar
       FROM Listings l
       JOIN Users u ON l.user_id = u.user_id
       LEFT JOIN Animals a ON l.animal_id = a.animal_id
       LEFT JOIN Species s ON a.species_id = s.species_id
       LEFT JOIN Users ru ON l.resolved_by = ru.user_id
       WHERE l.listing_id = ?`,
      [req.params.id]
    );

    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const comments = await db.query(
      `SELECT 
         c.comment_id,
         c.text,
         c.timestamp,
         c.user_id,
         u.name AS user_name,
         u.avatar_url AS user_avatar
       FROM Comments c
       JOIN Users u ON c.user_id = u.user_id
       WHERE c.listing_id = ?
       ORDER BY c.timestamp ASC`,
      [req.params.id]
    );

    return res.json({ listing: enrichListingWithPoints(listing), comments });
  } catch (err) {
    console.error('Fetch listing error:', err);
    return res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// CREATE listing: supports Aid Request ('request'), Direct Deed ('deed'), or Photo-Only Sighting ('photo')
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      animal_id,
      species_id,
      nickname,
      predicted_species,
      confidence,
      help_type = 'feed',
      post_kind,
      description = '',
      photo_url,
      latitude,
      longitude
    } = req.body;

    if (!photo_url) {
      return res.status(400).json({ error: 'photo_url is required' });
    }

    const validTypes = ['shelter', 'feed', 'clothes', 'vaccine', 'rescue', 'adoption'];
    const safeHelpType = validTypes.includes(help_type) ? help_type : 'feed';
    const resolvedPostKind = classifyPostIntent(description, post_kind);

    if (resolvedPostKind === 'request' && !description.trim()) {
      return res.status(400).json({ error: 'description is required for aid requests' });
    }

    const lat = latitude || 28.6295;
    const lng = longitude || 77.3715;

    let linkedAnimalId = animal_id || null;
    let resolvedSpeciesName = predicted_species || '';

    // Resolve species if not linked yet
    let resolvedSpeciesId = species_id ? Number(species_id) : null;
    let detectedConf = confidence || 0.94;
    if (!linkedAnimalId && !resolvedSpeciesId) {
      const aiResult = await classifySpeciesQuery(`${description} ${nickname || ''} ${photo_url}`);
      resolvedSpeciesId = aiResult?.matched?.species_id;
      resolvedSpeciesName = resolvedSpeciesName || aiResult?.matched?.name;
      detectedConf = aiResult?.confidence || detectedConf;
    }

    // For direct completed deed post, run AI photo check before recording
    let deedVerification = null;
    if (resolvedPostKind === 'deed') {
      deedVerification = await verifyDeedPhoto({
        originalPhotoUrl: photo_url,
        originalSpeciesName: resolvedSpeciesName,
        originalDescription: description,
        proofPhotoUrl: photo_url,
        proofHint: `${nickname || ''} ${description}`,
        helpType: safeHelpType
      });
      if (!deedVerification.verified) {
        return res.status(422).json({
          error: deedVerification.reason || 'AI could not verify deed photo',
          verification: deedVerification
        });
      }
    }

    const basePawPoints =
      resolvedPostKind === 'deed'
        ? (RESOLVE_PAW_POINTS_BY_HELP[safeHelpType] ?? 100)
        : resolvedPostKind === 'photo'
          ? SIGHTING_PAW_POINTS
          : (POST_PAW_POINTS_BY_HELP[safeHelpType] ?? 40);

    let dexUpdate = null;
    if (!linkedAnimalId && resolvedSpeciesId) {
      dexUpdate = await recordSpeciesCapture({
        userId: req.user.user_id,
        speciesId: resolvedSpeciesId,
        nickname,
        photoUrl: photo_url,
        latitude: lat,
        longitude: lng,
        predictedSpecies: resolvedSpeciesName,
        confidence: detectedConf,
        basePawPoints,
        logDeed: false
      });
      linkedAnimalId = dexUpdate.animalId;
      resolvedSpeciesName = dexUpdate.species?.name || resolvedSpeciesName;
    }

    const finalDescription = description.trim() || (
      resolvedPostKind === 'deed'
        ? `Completed ${safeHelpType} deed for ${nickname?.trim() || resolvedSpeciesName || 'animal'}`
        : `Spotted ${nickname?.trim() || resolvedSpeciesName || 'animal'} near Sector 62`
    );

    const postPawAwarded = dexUpdate?.pawPointsAwarded ?? basePawPoints;
    const isDirectDeed = resolvedPostKind === 'deed';

    const result = await db.run(
      `INSERT INTO Listings (
         user_id, animal_id, help_type, description, photo_url, latitude, longitude,
         status, resolved_photo_url, resolved_by, post_kind, post_paw_points,
         ai_verified, ai_verification_score, ai_verification_note, resolved_paw_points
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        linkedAnimalId,
        safeHelpType,
        finalDescription,
        photo_url,
        lat,
        lng,
        isDirectDeed ? 'resolved' : 'open',
        isDirectDeed ? photo_url : null,
        isDirectDeed ? req.user.user_id : null,
        resolvedPostKind,
        postPawAwarded,
        isDirectDeed ? 1 : 0,
        isDirectDeed ? (deedVerification?.confidence || 0.95) : null,
        isDirectDeed ? (deedVerification?.reason || `AI confirmed ${safeHelpType} deed`) : null,
        isDirectDeed ? postPawAwarded : 0
      ]
    );
    const listingId = result.insertId;

    // Record unified PAW/Deed points via single Deeds ledger
    const deedAction = isDirectDeed
      ? 'resolve_listing'
      : (resolvedPostKind === 'photo' ? 'photo_sighting' : 'create_listing');
    const deedResult = await recordDeed(req.user.user_id, deedAction, postPawAwarded, listingId);

    const created = await db.get(
      `SELECT l.*, u.name as poster_name, u.avatar_url as poster_avatar,
              a.nickname as animal_nickname, s.name as species_name, s.icon as species_icon,
              ru.name as resolver_name, ru.avatar_url as resolver_avatar
       FROM Listings l
       JOIN Users u ON l.user_id = u.user_id
       LEFT JOIN Animals a ON l.animal_id = a.animal_id
       LEFT JOIN Species s ON a.species_id = s.species_id
       LEFT JOIN Users ru ON l.resolved_by = ru.user_id
       WHERE l.listing_id = ?`,
      [listingId]
    );

    return res.status(201).json({
      listing: enrichListingWithPoints(created),
      postKind: resolvedPostKind,
      verification: deedVerification,
      dexUpdate,
      reward: {
        ...deedResult,
        pawPointsAwarded: postPawAwarded,
        newPawPoints: deedResult.newPawPoints,
        ...(dexUpdate
          ? {
              isNewSpecies: dexUpdate.isNewSpecies,
              dexStatus: dexUpdate.dexStatus,
              speciesScanCount: dexUpdate.speciesScanCount,
              prevLevel: dexUpdate.prevLevel,
              speciesLevel: dexUpdate.speciesLevel,
              speciesName: dexUpdate.species?.name
            }
          : {})
      }
    });
  } catch (err) {
    console.error('Create listing error:', err);
    return res.status(500).json({ error: 'Failed to create listing' });
  }
});

// POST comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    const listing = await db.get('SELECT listing_id FROM Listings WHERE listing_id = ?', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const result = await db.run(
      `INSERT INTO Comments (listing_id, user_id, text)
       VALUES (?, ?, ?)`,
      [req.params.id, req.user.user_id, text.trim()]
    );

    // Award deed (+10 pts) for community coordination
    const deedResult = await recordDeed(req.user.user_id, 'post_comment', 10, req.params.id);

    const comment = await db.get(
      `SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
       FROM Comments c
       JOIN Users u ON c.user_id = u.user_id
       WHERE c.comment_id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ comment, reward: deedResult });
  } catch (err) {
    console.error('Post comment error:', err);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

// RESOLVE listing with AI proof-photo verification against original post photo
router.post('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { resolved_photo_url, proof_hint } = req.body;
    if (!resolved_photo_url) {
      return res.status(400).json({ error: 'Photo proof required to resolve listing' });
    }

    const listing = await db.get(
      `SELECT l.*, a.nickname AS animal_nickname, s.name AS original_species_name
       FROM Listings l
       LEFT JOIN Animals a ON l.animal_id = a.animal_id
       LEFT JOIN Species s ON a.species_id = s.species_id
       WHERE l.listing_id = ?`,
      [req.params.id]
    );
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.status === 'resolved') {
      return res.status(400).json({ error: 'Listing is already resolved' });
    }

    const verification = await verifyDeedPhoto({
      originalPhotoUrl: listing.photo_url,
      originalSpeciesName: listing.original_species_name,
      originalDescription: listing.description,
      proofPhotoUrl: resolved_photo_url,
      proofHint: proof_hint || '',
      helpType: listing.help_type
    });

    if (!verification.verified) {
      return res.status(422).json({
        error: verification.reason || 'AI could not verify deed proof photo against original listing',
        verification
      });
    }

    const pawPointsAwarded = getResolvePawPoints(listing.help_type);

    await db.run(
      `UPDATE Listings
       SET status = 'resolved',
           resolved_photo_url = ?,
           resolved_by = ?,
           ai_verified = 1,
           ai_verification_score = ?,
           ai_verification_note = ?,
           resolved_paw_points = ?
       WHERE listing_id = ?`,
      [
        resolved_photo_url,
        req.user.user_id,
        verification.confidence,
        verification.reason,
        pawPointsAwarded,
        req.params.id
      ]
    );

    // Award unified PAW/Deed points from scaled deed reward
    const deedResult = await recordDeed(req.user.user_id, 'resolve_listing', pawPointsAwarded, req.params.id);

    const updated = await db.get(
      `SELECT l.*, u.name as poster_name, u.avatar_url as poster_avatar,
              a.nickname as animal_nickname, s.name as species_name, s.icon as species_icon,
              ru.name as resolver_name, ru.avatar_url as resolver_avatar
       FROM Listings l
       JOIN Users u ON l.user_id = u.user_id
       LEFT JOIN Animals a ON l.animal_id = a.animal_id
       LEFT JOIN Species s ON a.species_id = s.species_id
       LEFT JOIN Users ru ON l.resolved_by = ru.user_id
       WHERE l.listing_id = ?`,
      [req.params.id]
    );

    return res.json({
      listing: enrichListingWithPoints(updated),
      verification,
      reward: {
        ...deedResult,
        pawPointsAwarded,
        newPawPoints: deedResult.newPawPoints
      }
    });
  } catch (err) {
    console.error('Resolve error:', err);
    return res.status(500).json({ error: 'Failed to resolve listing' });
  }
});

export default router;
