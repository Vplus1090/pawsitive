import React from 'react';

export default function SplashScreen({ onSkip }) {
  return (
    <div
      onClick={onSkip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSkip?.(); }}
      className="absolute inset-0 z-50 bg-[#e3f4ae] flex flex-col items-center justify-center px-6 cursor-pointer select-none anim-tab-enter"
      aria-label="Starting Pawsitive"
    >
      <div className="flex flex-col items-center gap-4 anim-pop-in">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          shapeRendering="crispEdges"
          className="w-16 h-16 anim-sprite-idle"
        >
          <rect x="3" y="5" width="2" height="3" fill="#142211" />
          <rect x="6" y="3" width="2" height="3" fill="#142211" />
          <rect x="9" y="3" width="2" height="3" fill="#142211" />
          <rect x="11" y="6" width="2" height="3" fill="#142211" />
          <rect x="5" y="8" width="6" height="4" fill="#142211" />
          <rect x="4" y="9" width="8" height="3" fill="#142211" />
          <rect x="6" y="12" width="4" height="1" fill="#142211" />
        </svg>

        <h1 className="font-press-start text-lg tracking-widest text-[#142211]">
          PAWSITIVE
        </h1>

        <div className="w-36 h-2.5 bg-[#edf7c8] border-2 border-[#142211] p-[1px] overflow-hidden">
          <div className="h-full bg-[#142211] anim-boot-fill" />
        </div>

        <span className="font-silkscreen text-[9px] tracking-widest text-[#306230]">
          8-BIT ANIMAL DEX
        </span>
      </div>
    </div>
  );
}
