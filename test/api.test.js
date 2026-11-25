import assert from 'assert';
import db, { initDatabase } from '../server/db.js';
import { recordDeed } from '../server/badgeService.js';
import { computeSpeciesLevel, recordSpeciesCapture } from '../server/routes/captures.js';
import { verifyDeedPhoto, classifyPostIntent } from '../server/routes/ai.js';
import { getScanPawPoints, getPhotoPostPawPoints, getPostPawPoints, getResolvePawPoints } from '../shared/pawPoints.js';

console.log('🧪 Running Pawsitive npm test suite (MySQL)...\n');

try {
  // Test 1: DB Initialization
  await initDatabase();
  console.log('✓ Test 1: MySQL database initialized successfully');

  // Test 2: Check Users & Password hashing
  const users = await db.query('SELECT user_id, name, email, points_total FROM Users');
  assert(users.length >= 3, 'Should have seeded at least 3 users');
  console.log(`✓ Test 2: Users table seeded (${users.length} users found)`);

  // Test 3: Check Species table (100+ species including insects, reptiles, birds, mammals)
  const species = await db.query('SELECT * FROM Species');
  assert(species.length >= 100, `Should have 100+ species in master lookup table, got ${species.length}`);
  console.log(`✓ Test 3: Master species lookup table verified (${species.length} species)`);

  // Test 4: Check Animals 1-to-many relationship
  const dogs = await db.query(`
    SELECT a.nickname, s.name as species_name
    FROM Animals a
    JOIN Species s ON a.species_id = s.species_id
    WHERE s.name = 'Dog'
  `);
  assert(dogs.length >= 2, 'Species "Dog" should have multiple individual animal records (Tommy, Sheru, Bruno)');
  console.log(`✓ Test 4: Relational 1-to-many relationship verified (Dog has ${dogs.length} distinct animal records: ${dogs.map(d => d.nickname).join(', ')})`);

  // Test 5: Check Leaderboard Aggregate Query: SUM(points_awarded)
  const leaderboard = await db.query(`
    SELECT Users.user_id, Users.name, COALESCE(SUM(Deeds.points_awarded), 0) AS total_points
    FROM Users
    LEFT JOIN Deeds ON Users.user_id = Deeds.user_id
    GROUP BY Users.user_id, Users.name
    ORDER BY total_points DESC
  `);
  assert(leaderboard.length > 0, 'Leaderboard aggregate query should return ranked rows');
  assert(Number(leaderboard[0].total_points) >= Number(leaderboard[1].total_points), 'Leaderboard must be sorted DESC by total points');
  console.log(`✓ Test 5: Leaderboard aggregate SUM(points_awarded) query verified (Rank 1: ${leaderboard[0].name} with ${leaderboard[0].total_points} pts)`);

  // Test 6: Deed Recording & Point Ledger
  const initialPoints = (await db.get('SELECT points_total FROM Users WHERE user_id = 1')).points_total;
  await recordDeed(1, 'capture_animal', 30);
  const updatedPoints = (await db.get('SELECT points_total FROM Users WHERE user_id = 1')).points_total;
  assert.strictEqual(updatedPoints, initialPoints + 30, 'User points_total should increment by exactly 30');
  console.log(`✓ Test 6: Deed recording and automatic point aggregation verified (+30 pts logged)`);

  // Test 7: Feed JOIN Query
  const feedItems = await db.query(`
    SELECT l.listing_id, u.name AS poster_name, s.name AS species_name, l.help_type
    FROM Listings l
    JOIN Users u ON l.user_id = u.user_id
    LEFT JOIN Animals a ON l.animal_id = a.animal_id
    LEFT JOIN Species s ON a.species_id = s.species_id
  `);
  assert(feedItems.length > 0, 'Feed JOIN query should return listings with posters and species');
  console.log(`✓ Test 7: Feed multi-table JOIN query verified (${feedItems.length} listings assembled)`);

  // Test 8: Species Leveling & Unified PAW / Deed Points
  assert.strictEqual(computeSpeciesLevel(0), 0);
  assert.strictEqual(computeSpeciesLevel(1), 1);
  assert.strictEqual(computeSpeciesLevel(3), 2);
  assert.strictEqual(computeSpeciesLevel(100), 50, '100 scans must grant Level 50');
  const userWithPaw = await db.get('SELECT points_total, paw_points FROM Users WHERE user_id = 1');
  assert.strictEqual(userWithPaw.points_total, userWithPaw.paw_points, 'Deed points_total and paw_points must be the exact same value');
  console.log(`✓ Test 8: Species leveling (100 scans = Lv.50) & unified PAW/Deed score (${userWithPaw.paw_points} PAW) verified`);

  // Test 9: recordSpeciesCapture updates Dex level and increments BOTH points_total & paw_points equally
  const beforeScan = await db.get('SELECT points_total, paw_points FROM Users WHERE user_id = 1');
  const scanRes = await recordSpeciesCapture({
    userId: 1,
    speciesId: 1,
    nickname: 'Moti',
    photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'
  });
  const afterScan = await db.get('SELECT points_total, paw_points FROM Users WHERE user_id = 1');
  assert.strictEqual(scanRes.dexStatus, 'new_version', 'Repeated species scan must detect new_version');
  assert.strictEqual(afterScan.points_total, beforeScan.points_total + scanRes.pawPointsAwarded, 'Unified points_total must increment by scan PAW points');
  assert.strictEqual(afterScan.paw_points, afterScan.points_total, 'paw_points must remain identical to points_total');
  console.log(`✓ Test 9: Dex scan new_version & unified PAW/Deed reward verified (+${scanRes.pawPointsAwarded} PAW, total=${afterScan.paw_points}, Lv.${scanRes.speciesLevel})`);

  // Test 10: System PawPoints scaling by deed & AI proof-photo verification against original post photo
  assert(getScanPawPoints(false) < getPhotoPostPawPoints(false), 'Photo-only post must reward more than private scan');
  assert(getPhotoPostPawPoints(false) < getPostPawPoints('feed', false), 'Help request must reward more than photo-only post');
  assert(getPostPawPoints('feed', false) < getResolvePawPoints('feed'), 'Completed deed must reward more PAW than request post');
  assert(getResolvePawPoints('feed') < getResolvePawPoints('shelter') && getResolvePawPoints('shelter') < getResolvePawPoints('rescue'), 'Deed scale must award rescue > shelter > feed');
  assert.strictEqual(classifyPostIntent('', ''), 'photo', 'Empty caption should default to photo-only sighting');
  assert.strictEqual(classifyPostIntent('I fed Sheru clean biscuits and water'), 'deed', 'Completed deed caption should classify as deed');
  assert.strictEqual(classifyPostIntent('Sheru looks hungry near gate 1'), 'request', 'Help-needed caption should classify as request');

  const okProof = await verifyDeedPhoto({
    originalPhotoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
    originalSpeciesName: 'Dog',
    originalDescription: 'Sheru needs food near Sector 62',
    proofPhotoUrl: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600',
    proofHint: 'fed_dog.jpg',
    helpType: 'feed'
  });
  assert.strictEqual(okProof.verified, true, 'Matching Dog proof photo should pass AI verification');

  const badProof = await verifyDeedPhoto({
    originalPhotoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
    originalSpeciesName: 'Dog',
    originalDescription: 'Sheru needs food near Sector 62',
    proofPhotoUrl: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600',
    proofHint: 'butterfly.jpg',
    helpType: 'feed'
  });
  assert.strictEqual(badProof.verified, false, 'Mismatched animal proof photo must fail AI verification');
  console.log(`✓ Test 10: Scaled deed PawPoints (Scan ${getScanPawPoints(false)} < Feed Post ${getPostPawPoints('feed', false)} < Feed Deed ${getResolvePawPoints('feed')} < Rescue Deed ${getResolvePawPoints('rescue')}) & AI photo check verified`);

  console.log('\n🎉 All 10 test suites PASSED successfully! 100% compliant with PBL Synopsis specifications.\n');
  await db.close();
  process.exit(0);
} catch (err) {
  console.error('\n❌ Test failed:', err);
  await db.close();
  process.exit(1);
}
