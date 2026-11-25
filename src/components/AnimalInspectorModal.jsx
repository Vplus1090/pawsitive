import React from 'react';
import { X, Shield, Drumstick, Star } from 'lucide-react';
import { PixelAnimalSprite } from './PixelSprites';
import { createSwipeDownHandlers } from '../utils/retroFeedback';

export default function AnimalInspectorModal({ animal: species, onClose }) {
  if (!species) return null;

  const level = species.level || 1;
  const scans = species.captureCount || 0;
  const nextLevelScans = species.nextLevelScans || level * 2 + 1;
  const scansInTier = scans % 2 === 1 ? 1 : 2;
  const tierPct = scans === 0 ? 0 : Math.round((scansInTier / 2) * 100);
  const specimens = species.specimens || [];
  const swipeHandlers = createSwipeDownHandlers(onClose);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="absolute inset-0 bg-black/75 z-50 flex items-end justify-center p-2.5 pb-3 font-silkscreen anim-backdrop-in"
    >
      <div
        {...swipeHandlers}
        className="gb-card w-full relative p-3.5 space-y-3 max-h-[88%] overflow-y-auto anim-sheet-up"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-[#142211]">
            <span className="flex items-center gap-1"><Drumstick className="w-3 h-3" /> {scans}x</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> #{String(species.species_id || 1).padStart(3, '0')}</span>
            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-[#306230]" /> Lv.{level}</span>
          </div>
          <button
            onClick={onClose}
            className="gb-btn w-6 h-6 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hero Species Header */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="font-press-start text-2xl text-[#142211]">
              {String(level).padStart(2, '0')}
              <span className="text-[10px] font-silkscreen ml-1">LV</span>
            </div>
            <h3 className="text-xs text-[#142211] mt-1 uppercase">{species.name}</h3>
            <p className="text-[9px] text-[#306230]">{species.category} · {scans} scanned</p>
          </div>
          <PixelAnimalSprite species={species.name || 'Dog'} className="w-20 h-20" />
        </div>

        {/* Species Level Progress Bar (2 scans = +1 level, 100 scans = Lv.50) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-[#142211]">
            <span>Next Lv.{level + 1}</span>
            <span>{scans}/{nextLevelScans} scans</span>
          </div>
          <div className="gb-pill-track h-4">
            <div className="h-full bg-[#7d9b3b]" style={{ width: `${tierPct}%` }} />
          </div>
        </div>

        <p className="text-[11px] font-pixelify text-[#22381c] leading-snug">
          {species.description || 'Community animal tracked in the regional Pokédex.'}
        </p>

        {/* Scanned Versions List (e.g., Sheru, Bruno) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-[#142211]">
            <span>Scanned Versions</span>
            <span className="text-[#306230]">{specimens.length}</span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {specimens.map((sp) => (
              <div key={sp.capture_id} className="gb-input p-2 flex items-center gap-2.5">
                <img
                  src={sp.photo_url}
                  alt={sp.nickname}
                  className="w-10 h-10 rounded-lg object-cover border border-[#142211] flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-[#142211] truncate">{sp.nickname}</p>
                  <p className="text-[8px] text-[#306230]">
                    {new Date(sp.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Sector 62
                  </p>
                </div>
                <span className="bg-[#7d9b3b] text-[#ecf7c6] px-1.5 py-0.5 rounded text-[8px] flex-shrink-0">
                  +25 PAW
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="gb-btn-dark w-full py-2 text-[10px] cursor-pointer"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
