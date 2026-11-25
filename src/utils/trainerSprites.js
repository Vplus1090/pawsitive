// 4 cute 16-bit Game Boy olive-lime pixel trainer avatar sprites (stored cleanly as crisp SVG data URIs)

function makePixelAvatarSvg(body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="#e3f4ae"/>${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const TRAINER_SPRITE_PRESETS = [
  {
    id: 'cap',
    label: 'Cap',
    url: makePixelAvatarSvg(
      // Red/olive Ash-style scout cap + scarf
      '<rect x="4" y="2" width="8" height="2" fill="#3f5926"/>' +
      '<rect x="3" y="4" width="11" height="2" fill="#142211"/>' +
      '<rect x="6" y="3" width="3" height="1" fill="#edf7c8"/>' +
      // Face
      '<rect x="4" y="6" width="8" height="5" fill="#edf7c8"/>' +
      '<rect x="3" y="6" width="1" height="4" fill="#142211"/>' +
      '<rect x="12" y="6" width="1" height="4" fill="#142211"/>' +
      // Cute eyes & blush
      '<rect x="5" y="7" width="1" height="2" fill="#142211"/>' +
      '<rect x="10" y="7" width="1" height="2" fill="#142211"/>' +
      '<rect x="4" y="9" width="1" height="1" fill="#7d9b3b"/>' +
      '<rect x="11" y="9" width="1" height="1" fill="#7d9b3b"/>' +
      '<rect x="7" y="10" width="2" height="1" fill="#142211"/>' +
      // Jacket & scarf
      '<rect x="3" y="11" width="10" height="5" fill="#3f5926"/>' +
      '<rect x="5" y="11" width="6" height="2" fill="#7d9b3b"/>' +
      '<rect x="7" y="12" width="2" height="4" fill="#edf7c8"/>'
    )
  },
  {
    id: 'catgirl',
    label: 'Paws',
    url: makePixelAvatarSvg(
      // Cute cat-ear headband & wavy hair
      '<rect x="3" y="2" width="2" height="2" fill="#142211"/>' +
      '<rect x="11" y="2" width="2" height="2" fill="#142211"/>' +
      '<rect x="4" y="3" width="8" height="2" fill="#3f5926"/>' +
      '<rect x="3" y="5" width="1" height="6" fill="#142211"/>' +
      '<rect x="12" y="5" width="1" height="6" fill="#142211"/>' +
      // Face
      '<rect x="4" y="5" width="8" height="6" fill="#edf7c8"/>' +
      // Eyes & smile
      '<rect x="5" y="7" width="1" height="2" fill="#142211"/>' +
      '<rect x="10" y="7" width="1" height="2" fill="#142211"/>' +
      '<rect x="7" y="9" width="2" height="1" fill="#3f5926"/>' +
      // Hoodie
      '<rect x="3" y="11" width="10" height="5" fill="#7d9b3b"/>' +
      '<rect x="5" y="12" width="6" height="4" fill="#3f5926"/>' +
      '<rect x="7" y="12" width="2" height="1" fill="#edf7c8"/>'
    )
  },
  {
    id: 'tech',
    label: 'Visor',
    url: makePixelAvatarSvg(
      // Spiky hair
      '<rect x="4" y="2" width="2" height="2" fill="#142211"/>' +
      '<rect x="7" y="1" width="3" height="3" fill="#142211"/>' +
      '<rect x="10" y="2" width="2" height="2" fill="#142211"/>' +
      '<rect x="3" y="4" width="10" height="2" fill="#142211"/>' +
      // Face + pixel glasses
      '<rect x="4" y="6" width="8" height="5" fill="#edf7c8"/>' +
      '<rect x="4" y="7" width="3" height="2" fill="#142211"/>' +
      '<rect x="7" y="7" width="2" height="1" fill="#142211"/>' +
      '<rect x="9" y="7" width="3" height="2" fill="#142211"/>' +
      '<rect x="5" y="7" width="1" height="1" fill="#d7ee96"/>' +
      '<rect x="10" y="7" width="1" height="1" fill="#d7ee96"/>' +
      '<rect x="7" y="10" width="2" height="1" fill="#142211"/>' +
      // Vest
      '<rect x="3" y="11" width="10" height="5" fill="#142211"/>' +
      '<rect x="5" y="11" width="6" height="5" fill="#7d9b3b"/>' +
      '<rect x="7" y="13" width="2" height="1" fill="#edf7c8"/>'
    )
  },
  {
    id: 'ranger',
    label: 'Ranger',
    url: makePixelAvatarSvg(
      // Safari / ranger hat
      '<rect x="5" y="2" width="6" height="2" fill="#7d9b3b"/>' +
      '<rect x="2" y="4" width="12" height="1" fill="#142211"/>' +
      '<rect x="4" y="5" width="8" height="6" fill="#edf7c8"/>' +
      '<rect x="3" y="5" width="1" height="4" fill="#3f5926"/>' +
      '<rect x="12" y="5" width="1" height="4" fill="#3f5926"/>' +
      // Cute eyes & grin
      '<rect x="5" y="7" width="1" height="2" fill="#142211"/>' +
      '<rect x="10" y="7" width="1" height="2" fill="#142211"/>' +
      '<rect x="6" y="10" width="4" height="1" fill="#3f5926"/>' +
      // Cloak & badge
      '<rect x="3" y="11" width="10" height="5" fill="#3f5926"/>' +
      '<rect x="6" y="11" width="4" height="5" fill="#7d9b3b"/>' +
      '<rect x="9" y="12" width="2" height="2" fill="#edf7c8"/>'
    )
  }
];
