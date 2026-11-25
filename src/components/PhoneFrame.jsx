import React from 'react';
import { Lock } from 'lucide-react';
import { TRAINER_SPRITE_PRESETS } from '../../shared/trainerSprites';

export default function PhoneFrame({
  children,
  bottomNav,
  overlay,
  currentUser,
  onOpenSetup,
  activeTab
}) {
  return (
    <div className="min-h-screen bg-[#0c140a] flex flex-col items-center justify-center p-0 sm:py-4 sm:px-4 font-silkscreen select-none overflow-x-hidden">
      {/* Phone Bezel Container (everything strictly inside bezels, zero external header/bars) */}
      <main className="w-full max-w-[396px] flex justify-center">
        <div className="w-full bg-[#e3f4ae] flex flex-col relative overflow-hidden sm:rounded-[32px] sm:shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_0_8px_#0c140a] sm:border-[5px] sm:border-[#2a3d24] h-[100dvh] sm:h-[min(810px,calc(100vh-32px))]">
          {/* Top Bar inside light upper area (seamless with sky) */}
          <div className="bg-[#e3f4ae] px-4 pt-3.5 pb-2 flex items-center justify-between flex-shrink-0 z-20">
            <span className="font-press-start text-[#142211] text-sm tracking-wide">
              PAWSITIVE
            </span>

            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <span className="bg-[#142211] text-[#d7ee96] rounded-lg px-2 py-0.5 text-[10px] font-bold">
                  {currentUser.paw_points ?? currentUser.points_total ?? 0} PAW
                </span>
                <button
                  onClick={onOpenSetup}
                  className={`w-10 h-10 p-[2px] pixel-circle flex-shrink-0 cursor-pointer transition hover:scale-105 ${
                    activeTab === 'profile' ? 'bg-[#ecf7c6]' : 'bg-[#142211]'
                  }`}
                  title="Open Setup"
                >
                  <img
                    src={currentUser.avatar_url || TRAINER_SPRITE_PRESETS[0].url}
                    alt="User"
                    className="w-full h-full object-cover pixel-circle"
                  />
                </button>
              </div>
            ) : (
              <span className="bg-[#142211] text-[#d7ee96] rounded-lg px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> LOCKED
              </span>
            )}
          </div>

          {/* Screen Body */}
          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-[#e3f4ae]">
            <div className="flex-1 min-h-0 flex flex-col relative z-0">
              {children}
            </div>
          </div>

          {/* Floating Nav + Full-Screen Overlays (covers top bar too) */}
          {bottomNav}
          {overlay}
        </div>
      </main>
    </div>
  );
}
