import React from 'react';
import { Shield, Star, Drumstick } from 'lucide-react';
import { PixelAnimalSprite } from './PixelSprites';

export default function AnimalCard({ isSilhouette = false, speciesInfo, onSelect }) {
  if (isSilhouette) {
    return (
      <div
        onClick={() => onSelect && onSelect(speciesInfo)}
        className="gb-card-sm p-2.5 cursor-pointer flex flex-col justify-between gap-2 font-silkscreen hover:brightness-95 transition"
      >
        <div className="flex items-end justify-between gap-1">
          <div className="min-w-0">
            <div className="font-press-start text-base text-[#3f5926] leading-none">
              {speciesInfo?.species_id ? String(speciesInfo.species_id).padStart(2, '0') : '??'}
              <span className="text-[8px] font-silkscreen ml-0.5">?</span>
            </div>
            <p className="text-[9px] text-[#3f5926] truncate mt-1">Unknown</p>
          </div>

          <PixelAnimalSprite
            species={speciesInfo?.name || 'Dog'}
            className="w-13 h-13 silhouette-8bit opacity-85 flex-shrink-0"
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-[#3f5926] pt-0.5">
          <span>Scan wild</span>
          <Star className="w-3 h-3 text-[#537322]" />
        </div>
      </div>
    );
  }

  const level = speciesInfo?.level || 1;
  const scans = speciesInfo?.captureCount || 1;

  return (
    <div
      onClick={() => onSelect && onSelect(speciesInfo)}
      className="gb-card-sm p-2.5 cursor-pointer flex flex-col justify-between gap-2 font-silkscreen hover:brightness-95 transition"
    >
      {/* Main Row: Species Level + Species Name left, Pixel Sprite right */}
      <div className="flex items-end justify-between gap-1">
        <div className="min-w-0">
          <div className="font-press-start text-base text-[#142211] leading-none">
            {String(level).padStart(2, '0')}
            <span className="text-[8px] font-silkscreen ml-0.5">LV</span>
          </div>
          <p className="text-[9px] text-[#306230] truncate mt-1 uppercase">
            {speciesInfo?.name}
          </p>
        </div>

        <PixelAnimalSprite
          species={speciesInfo?.name || 'Dog'}
          className="w-13 h-13 flex-shrink-0"
        />
      </div>

      {/* Bottom Stat Mini Icons: Scans & Species Index */}
      <div className="flex items-center justify-between text-[9px] text-[#142211] pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5"><Drumstick className="w-2.5 h-2.5" /> {scans}x</span>
          <span className="flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> #{String(speciesInfo?.species_id || 1).padStart(2, '0')}</span>
        </div>
        <Star className="w-3 h-3 fill-[#306230] text-[#142211]" />
      </div>
    </div>
  );
}
