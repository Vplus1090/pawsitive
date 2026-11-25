import React from 'react';
import { BookOpen, Radar, Trophy, Camera, Send, X } from 'lucide-react';
import { fx } from '../utils/retroFeedback';

export default function BottomNav({
  activeTab,
  setActiveTab,
  isMenuOpen = false,
  onToggleMenu,
  onCloseMenu,
  onOpenCapture,
  onOpenCreateListing
}) {
  const navBtn = (id, label, Icon) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => {
          if (isMenuOpen && onCloseMenu) onCloseMenu();
          setActiveTab(id);
        }}
        className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] cursor-pointer transition active:scale-95 ${
          active
            ? 'gb-pixel-tab-active pixel-tab-clip font-bold'
            : 'text-[#8ba85c] hover:text-[#ecf7c6]'
        }`}
      >
        <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-none font-silkscreen">
      {/* Click-outside scrim when action chooser is open */}
      {isMenuOpen && (
        <div
          onClick={onCloseMenu}
          className="absolute inset-0 bg-black/45 pointer-events-auto anim-backdrop-in"
        />
      )}

      {/* 2-Option Floating Chooser: POST vs SCAN */}
      {isMenuOpen && (
        <div className="absolute bottom-[86px] right-3 pointer-events-auto w-36 bg-[#142211] p-[2px] pixel-pill-clip shadow-2xl anim-pop-in">
          <div className="bg-[#7d9b3b] p-[2px] pixel-pill-clip">
            <div className="bg-[#1b2d16] p-2 pixel-pill-clip space-y-1.5">
              <button
                onClick={() => {
                  fx.tap();
                  onOpenCreateListing();
                }}
                className="w-full gb-btn px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer"
              >
                <Send className="w-4 h-4 stroke-[2.3] flex-shrink-0 text-[#306230]" />
                <span className="text-[11px] font-bold text-[#142211]">POST</span>
              </button>

              <button
                onClick={() => {
                  fx.tap();
                  onOpenCapture();
                }}
                className="w-full gb-btn px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer"
              >
                <Camera className="w-4 h-4 stroke-[2.3] flex-shrink-0 text-[#306230]" />
                <span className="text-[11px] font-bold text-[#142211]">SCAN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation + Icon-Only Circle Button */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
        {/* 8-Bit Rounded Stepped Pixel Pill */}
        <div className="pointer-events-auto flex-1 bg-[#142211] p-[2px] pixel-pill-clip shadow-xl">
          <div className="bg-[#7d9b3b] p-[2px] pixel-pill-clip">
            <div className="bg-[#1b2d16] px-2 py-1.5 pixel-pill-clip flex items-center justify-between gap-1">
              {navBtn('pokedex', 'Dex', BookOpen)}
              {navBtn('feed', 'Feed', Radar)}
              {navBtn('leaderboard', 'Ranks', Trophy)}
            </div>
          </div>
        </div>

        {/* Separate Icon-Only 8-Bit Circle Action Button */}
        <button
          onClick={onToggleMenu}
          className="pointer-events-auto gb-pixel-scan-circle w-[66px] h-[66px] bg-[#142211] p-[2px] pixel-circle flex-shrink-0 cursor-pointer group"
          title="Post or Scan"
          aria-label="Post or Scan"
        >
          <div className="w-full h-full bg-[#d7ee96] p-[2px] pixel-circle">
            <div className={`w-full h-full pixel-circle flex items-center justify-center transition ${
              isMenuOpen
                ? 'bg-[#142211] text-[#d7ee96]'
                : 'bg-[#7d9b3b] group-hover:bg-[#8eb043] text-[#ecf7c6]'
            }`}>
              {isMenuOpen ? (
                <X className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Camera className="w-6 h-6 stroke-[2.2]" />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
