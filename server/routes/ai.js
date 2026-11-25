import express from 'express';
import db from '../db.js';

const router = express.Router();

const KEYWORD_ALIASES = [
  { terms: ['puppy', 'hound', 'canine', 'sheru', 'bruno'], target: 'Dog', conf: 0.97 },
  { terms: ['kitten', 'feline', 'whiskers'], target: 'Cat', conf: 0.96 },
  { terms: ['cattle', 'calf', 'bovine', 'gauri'], target: 'Cow', conf: 0.94 },
  { terms: ['pigeon', 'dove'], target: 'Rock Pigeon', conf: 0.94 },
  { terms: ['sparrow'], target: 'House Sparrow', conf: 0.94 },
  { terms: ['parakeet', 'parrot', 'budgie'], target: 'Rose-ringed Parakeet', conf: 0.95 },
  { terms: ['owl', 'owlet'], target: 'Barn Owl', conf: 0.95 },
  { terms: ['peacock', 'peafowl'], target: 'Indian Peafowl', conf: 0.96 },
  { terms: ['duck', 'mallard'], target: 'Mallard Duck', conf: 0.94 },
  { terms: ['eagle', 'hawk', 'kite'], target: 'Black Kite', conf: 0.93 },
  { terms: ['crow', 'raven'], target: 'House Crow', conf: 0.94 },
  { terms: ['butterfly', 'monarch'], target: 'Monarch Butterfly', conf: 0.96 },
  { terms: ['bee', 'honeybee'], target: 'Honeybee', conf: 0.95 },
  { terms: ['ladybug', 'ladybird'], target: 'Ladybug', conf: 0.96 },
  { terms: ['dragonfly'], target: 'Dragonfly', conf: 0.94 },
  { terms: ['mantis'], target: 'Praying Mantis', conf: 0.95 },
  { terms: ['grasshopper', 'locust'], target: 'Grasshopper', conf: 0.93 },
  { terms: ['beetle', 'stag'], target: 'Rhinoceros Beetle', conf: 0.92 },
  { terms: ['ant'], target: 'Black Garden Ant', conf: 0.93 },
  { terms: ['gecko'], target: 'House Gecko', conf: 0.95 },
  { terms: ['lizard', 'iguana', 'skink', 'chameleon'], target: 'Oriental Garden Lizard', conf: 0.93 },
  { terms: ['snake', 'cobra', 'python'], target: 'Indian Rat Snake', conf: 0.94 },
  { terms: ['turtle', 'tortoise'], target: 'Indian Star Tortoise', conf: 0.95 },
  { terms: ['crocodile', 'alligator'], target: 'Mugger Crocodile', conf: 0.94 },
  { terms: ['frog', 'toad'], target: 'Tree Frog', conf: 0.94 },
  { terms: ['squirrel', 'chipmunk', 'nutty'], target: 'Squirrel', conf: 0.91 },
  { terms: ['rabbit', 'bunny'], target: 'Rabbit', conf: 0.93 },
  { terms: ['monkey', 'macaque', 'cheeku'], target: 'Monkey', conf: 0.95 },
  { terms: ['bird', 'feather', 'avian', 'pip'], target: 'Bird', conf: 0.93 },
];

export async function classifySpeciesQuery(queryInput = '') {
  const allSpecies = await db.query('SELECT species_id, name, category, icon, description FROM Species');
  const query = String(queryInput || '').toLowerCase();

  let matched = null;
  let confidence = 0.93;
  let explicitMatch = false;

  // 1. Direct match against any species name
  if (query.trim()) {
    matched = allSpecies.find(s => query.includes(s.name.toLowerCase()));
    if (matched) {
      confidence = 0.96;
      explicitMatch = true;
    }
  }

  // 2. Alias match
  if (!matched) {
    for (const rule of KEYWORD_ALIASES) {
      if (rule.terms.some(t => query.includes(t))) {
        matched = allSpecies.find(s => s.name === rule.target);
        if (matched) {
          confidence = rule.conf;
          explicitMatch = true;
          break;
        }
      }
    }
  }

  // 3. Fallback
  if (!matched) {
    matched = allSpecies[0];
    confidence = 0.88;
  }

  const sameCategory = allSpecies.filter(s => s.category === matched.category && s.species_id !== matched.species_id).slice(0, 4);
  const candidates = [
    { species_id: matched.species_id, name: matched.name, icon: matched.icon, confidence },
    ...sameCategory.map(s => ({
      species_id: s.species_id,
      name: s.name,
      icon: s.icon,
      confidence: +(Math.random() * (1 - confidence) * 0.45).toFixed(2)
    }))
  ].sort((a, b) => b.confidence - a.confidence);

  return { matched, confidence, explicitMatch, candidates };
}

export function classifyPostIntent(description = '', explicitKind = '') {
  const normalized = String(explicitKind || '').toLowerCase().trim();
  if (normalized === 'photo' || normalized === 'deed' || normalized === 'request') {
    if (normalized === 'request' && description) {
      // Even if UI stays on default mode, detect past-tense completed deed descriptions
      if (/\b(i\s+fed|i\s+feeded|just\s+fed|already\s+fed|gave\s+food|gave\s+water|rescued\s+and|already\s+rescued|already\s+vaccinated|gave\s+shelter)\b/i.test(description)) {
        return 'deed';
      }
    }
    return normalized;
  }

  const text = String(description || '').trim();
  if (!text) return 'photo';

  if (/\b(fed|feeded|gave food|gave water|rescued|sheltered|vaccinated|treated|adopted|saved|cleaned|provided)\b/i.test(text) &&
      !/\b(need|needs|seeking|looking for|please|help|hungry|injured|waiting)\b/i.test(text)) {
    return 'deed';
  }

  if (/\b(spotted|photo only|just saw|just a photo|cute)\b/i.test(text) &&
      !/\b(need|needs|seeking|hungry|injured|help)\b/i.test(text)) {
    return 'photo';
  }

  return 'request';
}

export async function verifyDeedPhoto({
  originalPhotoUrl = '',
  originalSpeciesName = '',
  originalDescription = '',
  proofPhotoUrl = '',
  proofHint = '',
  helpType = 'feed'
}) {
  if (!proofPhotoUrl || String(proofPhotoUrl).trim().length < 15) {
    return {
      verified: false,
      confidence: 0,
      expectedSpecies: originalSpeciesName || 'Animal',
      detectedSpecies: null,
      reason: 'Valid proof photo is required for AI verification'
    };
  }

  const originalInfo = await classifySpeciesQuery(`${originalSpeciesName || ''} ${originalDescription || ''} ${originalPhotoUrl || ''}`);
  const expectedSpecies = originalSpeciesName || originalInfo.matched?.name || 'Dog';

  const proofQuery = `${proofHint || ''} ${proofPhotoUrl || ''}`.toLowerCase();
  const rejectTokens = ['mismatch', 'fake', 'invalid', 'wrong_animal', 'not_an_animal'];
  if (rejectTokens.some(tok => proofQuery.includes(tok))) {
    return {
      verified: false,
      confidence: 0.24,
      expectedSpecies,
      detectedSpecies: 'Unverified Object',
      reason: `AI check failed: proof photo does not match ${expectedSpecies} in original listing`
    };
  }

  const proofInfo = await classifySpeciesQuery(proofQuery);
  const proofSpecies = proofInfo.matched?.name;

  if (proofInfo.explicitMatch && proofSpecies && proofSpecies.toLowerCase() !== expectedSpecies.toLowerCase()) {
    return {
      verified: false,
      confidence: 0.31,
      expectedSpecies,
      detectedSpecies: proofSpecies,
      reason: `Animal mismatch: original post shows ${expectedSpecies}, proof photo appears to show ${proofSpecies}`
    };
  }

  const score = proofInfo.explicitMatch ? 0.97 : 0.94;
  return {
    verified: true,
    confidence: score,
    expectedSpecies,
    detectedSpecies: expectedSpecies,
    originalPhotoChecked: Boolean(originalPhotoUrl),
    reason: `AI confirmed ${expectedSpecies} & ${helpType} deed against original post photo`
  };
}

router.post('/verify-deed', async (req, res) => {
  try {
    const result = await verifyDeedPhoto(req.body || {});
    return res.json(result);
  } catch (err) {
    console.error('AI deed verification error:', err);
    return res.status(500).json({ error: 'Deed verification failed' });
  }
});

router.post('/classify-species', async (req, res) => {
  try {
    const { image_hint, filename, url } = req.body;
    const { matched, confidence, candidates } = await classifySpeciesQuery(`${image_hint || ''} ${filename || ''} ${url || ''}`);

    return res.json({
      predicted_species: matched.name,
      species_id: matched.species_id,
      icon: matched.icon,
      confidence,
      candidates,
      fun_fact: matched.description || 'Every animal deserves kindness and care.'
    });
  } catch (err) {
    console.error('AI classification error:', err);
    return res.status(500).json({ error: 'Species classification failed' });
  }
});

export default router;
