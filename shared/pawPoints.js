// Single source of truth for system-decided PawPoints across Scan, Photo Sighting, Help Request, and Verified Deeds

export const SCAN_PAW_POINTS = {
  base: 15,
  firstDiscoveryBonus: 20
};

export const SIGHTING_PAW_POINTS = 25;

export const POST_PAW_POINTS_BY_HELP = {
  feed: 40,
  clothes: 45,
  vaccine: 55,
  shelter: 60,
  adoption: 70,
  rescue: 80
};

export const RESOLVE_PAW_POINTS_BY_HELP = {
  feed: 100,
  clothes: 115,
  shelter: 140,
  vaccine: 150,
  adoption: 175,
  rescue: 200
};

export function getScanPawPoints(isNewSpecies = false) {
  return SCAN_PAW_POINTS.base + (isNewSpecies ? SCAN_PAW_POINTS.firstDiscoveryBonus : 0);
}

export function getPhotoPostPawPoints(isNewSpecies = false) {
  return SIGHTING_PAW_POINTS + (isNewSpecies ? SCAN_PAW_POINTS.firstDiscoveryBonus : 0);
}

export function getPostPawPoints(helpType = 'feed', isNewSpecies = false) {
  const base = POST_PAW_POINTS_BY_HELP[helpType] ?? 40;
  return base + (isNewSpecies ? SCAN_PAW_POINTS.firstDiscoveryBonus : 0);
}

export function getResolvePawPoints(helpType = 'feed', isNewSpecies = false) {
  const base = RESOLVE_PAW_POINTS_BY_HELP[helpType] ?? 100;
  return base + (isNewSpecies ? SCAN_PAW_POINTS.firstDiscoveryBonus : 0);
}
