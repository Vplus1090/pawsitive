import db from './db.js';

export async function recordDeed(userId, actionType, points, listingId = null) {
  const result = await db.run(
    `INSERT INTO Deeds (user_id, listing_id, action_type, points_awarded)
     VALUES (?, ?, ?, ?)`,
    [userId, listingId, actionType, points]
  );

  // Update unified points_total & paw_points on user record from Deeds ledger
  await db.run(
    `UPDATE Users
     SET points_total = (
       SELECT COALESCE(SUM(points_awarded), 0)
       FROM Deeds
       WHERE Deeds.user_id = ?
     ),
     paw_points = (
       SELECT COALESCE(SUM(points_awarded), 0)
       FROM Deeds
       WHERE Deeds.user_id = ?
     )
     WHERE user_id = ?`,
    [userId, userId, userId]
  );

  // Check for newly unlocked badges
  const newlyUnlocked = await checkAndAwardBadges(userId);

  const updatedUser = await db.get(
    `SELECT user_id, name, email, location, points_total, paw_points, avatar_url
     FROM Users WHERE user_id = ?`,
    [userId]
  );

  return {
    deed_id: result.insertId,
    actionType,
    pointsAwarded: points,
    newTotalPoints: updatedUser.points_total,
    newPawPoints: updatedUser.paw_points,
    newlyUnlockedBadges: newlyUnlocked
  };
}

export async function checkAndAwardBadges(userId) {
  const existingBadges = (
    await db.query(`SELECT badge_id FROM UserBadges WHERE user_id = ?`, [userId])
  ).map(r => r.badge_id);

  const allBadges = await db.query(`SELECT * FROM Badges`);

  // User stats
  const capturesCount = (
    await db.get(`SELECT COUNT(DISTINCT animal_id) as count FROM Captures WHERE user_id = ?`, [userId])
  )?.count || 0;

  const listingsCount = (
    await db.get(`SELECT COUNT(*) as count FROM Listings WHERE user_id = ?`, [userId])
  )?.count || 0;

  const resolvedCount = (
    await db.get(`SELECT COUNT(*) as count FROM Listings WHERE resolved_by = ?`, [userId])
  )?.count || 0;

  const commentsCount = (
    await db.get(`SELECT COUNT(*) as count FROM Comments WHERE user_id = ?`, [userId])
  )?.count || 0;

  const totalPoints = (
    await db.get(`SELECT points_total FROM Users WHERE user_id = ?`, [userId])
  )?.points_total || 0;

  const newlyAwarded = [];

  for (const b of allBadges) {
    if (existingBadges.includes(b.badge_id)) continue;

    let qualifies = false;
    if (b.badge_id === 1 && capturesCount >= 1) qualifies = true;
    if (b.badge_id === 2 && capturesCount >= 3) qualifies = true;
    if (b.badge_id === 3 && capturesCount >= 6) qualifies = true;
    if (b.badge_id === 4 && listingsCount >= 1) qualifies = true;
    if (b.badge_id === 5 && resolvedCount >= 1) qualifies = true;
    if (b.badge_id === 6 && commentsCount >= 3) qualifies = true;
    if (b.badge_id === 7 && totalPoints >= 200) qualifies = true;

    if (qualifies) {
      await db.run(
        `INSERT IGNORE INTO UserBadges (user_id, badge_id) VALUES (?, ?)`,
        [userId, b.badge_id]
      );
      newlyAwarded.push(b);
    }
  }

  return newlyAwarded;
}
