import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Shield, Drumstick, Star } from 'lucide-react';
import AnimalCard from './AnimalCard';
import { PixelAnimalSprite, PixelHabitatBg } from './PixelSprites';
import { api } from '../api';
import { fx } from '../utils/retroFeedback';

const CATEGORY_FILTERS = ['ALL', 'Mammal', 'Bird', 'Insect', 'Reptile', 'Amphibian'];

export default function PokedexTab({ onOpenCapture, onInspectAnimal }) {
  const [pokedexData, setPokedexData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchPokedex = async () => {
    setLoading(true);
    try {
      const data = await api.getPokedex();
      setPokedexData(data);
    } catch (err) {
      console.error('Failed to fetch pokedex:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPokedex();
  }, []);

  const totalSpecies = pokedexData?.totalSpecies || 130;
  const capturedCount = pokedexData?.capturedSpeciesCount || 0;
  const list = pokedexData?.pokedex || [];

  const filteredList = list.filter(item => {
    if (filterMode === 'captured' && !item.isCaptured) return false;
    if (filterMode === 'silhouettes' && item.isCaptured) return false;
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'Amphibian') {
        return item.category === 'Amphibian' || item.category === 'Critter';
      }
      return item.category === categoryFilter;
    }
    return true;
  });

  const safeIndex = filteredList.length > 0 ? Math.min(activeIndex, filteredList.length - 1) : 0;
  const focusedSpecies = filteredList[safeIndex] || null;

  const handlePrev = () => {
    if (filteredList.length === 0) return;
    fx.tap();
    setActiveIndex(prev => (prev - 1 + filteredList.length) % filteredList.length);
  };

  const handleNext = () => {
    if (filteredList.length === 0) return;
    fx.tap();
    setActiveIndex(prev => (prev + 1) % filteredList.length);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col font-silkscreen">
      {/* Separate Upper Area with Subtle Land & Sky Pixel Background */}
      <div className="bg-[#e3f4ae] px-4 pt-3 pb-4 flex-shrink-0 relative overflow-hidden">
        <PixelHabitatBg className="absolute inset-0 w-full h-full pointer-events-none" />
        {!loading && focusedSpecies && (
          <div className="text-[#142211] space-y-3 relative z-10">
            {/* Hero Split: Species Level + Name left, Pixel Sprite right */}
            <div
              onClick={() => {
                if (focusedSpecies.isCaptured) {
                  onInspectAnimal(focusedSpecies);
                } else {
                  onOpenCapture();
                }
              }}
              className="flex items-end justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="font-press-start text-3xl text-[#142211] leading-none tracking-tight">
                  {focusedSpecies.isCaptured ? String(focusedSpecies.level).padStart(2, '0') : '00'}
                  <span className="text-xs font-silkscreen ml-1">
                    {focusedSpecies.isCaptured ? 'LV' : '?'}
                  </span>
                </div>
                <p className="text-[11px] text-[#142211] mt-1.5 truncate uppercase">
                  {focusedSpecies.isCaptured
                    ? `${focusedSpecies.name} · ${focusedSpecies.captureCount} scanned`
                    : `unknown · ${focusedSpecies.category}`}
                </p>
              </div>

              <PixelAnimalSprite
                species={focusedSpecies.name}
                className={`w-24 h-24 flex-shrink-0 ${focusedSpecies.isCaptured ? 'anim-sprite-idle' : 'silhouette-8bit opacity-85'}`}
              />
            </div>

            {/* Bottom Stat Row + Prev/Next */}
            <div className="flex items-center justify-between text-[10px] text-[#142211] pt-1">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <Drumstick className="w-3 h-3" /> {focusedSpecies.captureCount || 0}x
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> #{String(focusedSpecies.species_id).padStart(3, '0')}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#306230]" /> {capturedCount}/{totalSpecies}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  className="gb-btn w-6 h-6 flex items-center justify-center cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNext}
                  className="gb-btn w-6 h-6 flex items-center justify-center cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 16-Bit Beveled Edge-to-Edge Darker Rounded Grid Sheet */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#142211] pt-[2px] sheet-16bit-clip">
        <div className="flex-1 min-h-0 flex flex-col bg-[#7d9b3b] pt-[3px] sheet-16bit-clip">
          <div className="flex-1 min-h-0 flex flex-col bg-[#2b4220] pt-[3px] sheet-16bit-clip">
            <div className="flex-1 min-h-0 overflow-y-auto bg-[#142211] px-3 pt-4 pb-24 space-y-2.5 sheet-16bit-clip">
              {/* Filter Row */}
              <div className="flex items-center gap-1.5 text-[10px]">
                {[
                  { id: 'all', label: `ALL ${list.length}` },
                  { id: 'captured', label: `OWN ${capturedCount}` },
                  { id: 'silhouettes', label: `??? ${totalSpecies - capturedCount}` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setFilterMode(tab.id); setActiveIndex(0); }}
                    className={`flex-1 py-1.5 cursor-pointer ${
                      filterMode === tab.id ? 'gb-btn-active' : 'gb-btn'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Category Filter Strip (Mammal, Bird, Insect, Reptile, Amphibian) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[9px]">
                {CATEGORY_FILTERS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategoryFilter(cat); setActiveIndex(0); }}
                    className={`px-2.5 py-1 whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat ? 'gb-btn-active' : 'gb-btn'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Types' : `${cat}s`}
                  </button>
                ))}
              </div>

              {/* One Card Per Species */}
              {loading ? (
                <div className="py-8 text-center text-[#9bbc0f] text-[10px]">Loading...</div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredList.map(species => (
                    <AnimalCard
                      key={species.species_id}
                      isSilhouette={!species.isCaptured}
                      speciesInfo={species}
                      onSelect={(item) => {
                        if (item.isCaptured) {
                          onInspectAnimal(item);
                        } else {
                          onOpenCapture();
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
