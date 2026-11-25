import React, { useState, useEffect } from 'react';
import { Check, Heart, Shield, Drumstick, Volume2, VolumeX, Smartphone, LogIn, LogOut } from 'lucide-react';
import { api } from '../api';
import { fx, isSfxMuted, setSfxMuted, isHapticMuted, setHapticMuted } from '../utils/retroFeedback';
import { TRAINER_SPRITE_PRESETS } from '../../shared/trainerSprites';

export default function ProfileTab({
  currentUser,
  onOpenAuth,
  onSignOut
}) {
  const [profileData, setProfileData] = useState(null);
  const [allBadges, setAllBadges] = useState([]);
  const [sfxMuted, setSfxMutedState] = useState(() => isSfxMuted());
  const [hapticMuted, setHapticMutedState] = useState(() => isHapticMuted());

  const fetchProfile = async () => {
    try {
      const [meRes, badgesRes] = await Promise.all([
        currentUser ? api.getMe() : Promise.resolve(null),
        api.getBadges()
      ]);
      setProfileData(meRes);
      setAllBadges(badgesRes);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const user = profileData?.user || currentUser;
  const stats = profileData?.stats || { captures: 0, listings: 0, resolved: 0, deeds: 0 };
  const earnedBadges = profileData?.badges || [];
  const earnedBadgeIds = earnedBadges.map(b => b.badge_id);

  const pawPoints = user?.paw_points ?? 0;
  const xpLevel = Math.floor(pawPoints / 100) + 1;
  const xpProgress = pawPoints % 100;

  return (
    <div className="p-3 space-y-3 font-silkscreen">
      {/* Account Card (Sign In / Create Account / Sign Out) */}
      <div className="gb-card p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-[#142211]">
          <span>Account</span>
          {user && (
            <span className="text-[9px] text-[#306230] truncate max-w-[170px]">{user.email}</span>
          )}
        </div>

        {!user ? (
          <>
            <p className="text-[11px] font-pixelify text-[#22381c] leading-snug">
              Sign in or make an account to save your Dex levels, PawPoints, and deeds.
            </p>
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="w-full gb-btn-dark py-2 px-2.5 flex items-center justify-center gap-1.5 text-[10px] cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>SIGN IN / MAKE ACCOUNT</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onSignOut && onSignOut()}
            className="w-full gb-btn-dark py-2 px-2.5 flex items-center justify-center gap-1.5 text-[10px] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SIGN OUT</span>
          </button>
        )}
      </div>

      {/* Trainer Progress Card with Separate PawPoints */}
      {user && (
      <div className="gb-card p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] text-[#142211]">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1"><Drumstick className="w-3 h-3" /> {stats.captures} scans</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {stats.resolved} aided</span>
          </div>
          <span className="bg-[#142211] text-[#d7ee96] px-2 py-0.5 rounded-lg text-[9px]">Lv.{xpLevel}</span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <img
            src={user?.avatar_url || TRAINER_SPRITE_PRESETS[0].url}
            alt={user?.name}
            className="w-12 h-12 rounded-xl object-cover border-2 border-[#142211]"
          />
          <div className="min-w-0 flex-1">
            <div className="font-press-start text-lg text-[#142211] leading-none">
              {pawPoints}
              <span className="text-[9px] font-silkscreen ml-1">PAW</span>
            </div>
            <p className="text-[11px] text-[#142211] truncate mt-1">{user?.name || 'Trainer'}</p>
            <p className="text-[9px] text-[#306230]">
              {user?.location || 'Sector 62'}
            </p>
          </div>
        </div>

        <div className="gb-pill-track h-7 flex items-center justify-between px-2.5 text-[10px]">
          <div className="absolute inset-y-0 left-0 bg-[#7d9b3b]" style={{ width: `${Math.max(xpProgress, 15)}%` }} />
          <span className="relative z-10 flex items-center gap-1.5 text-[#ecf7c6]">
            <Heart className="w-3.5 h-3.5 fill-[#142211] text-[#142211]" /> PawPoints Lv.{xpLevel + 1}
          </span>
          <span className="relative z-10 text-[#142211] font-bold">{xpProgress}%</span>
        </div>
      </div>
      )}

      {/* Badges Checklist Card */}
      <div className="gb-card p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-[#142211]">
          <span>Badges</span>
          <span className="text-[10px] text-[#306230]">{earnedBadges.length}/{allBadges.length}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {allBadges.map(badge => {
            const isUnlocked = earnedBadgeIds.includes(badge.badge_id);
            return (
              <div key={badge.badge_id} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border border-[#142211] ${
                  isUnlocked ? 'bg-[#142211] text-[#d7ee96]' : 'bg-[#edf7c8]'
                }`}>
                  {isUnlocked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className={`text-[10px] truncate ${isUnlocked ? 'text-[#142211]' : 'text-[#5b7a2c]'}`}>
                  {badge.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sound & Haptics Settings */}
      <div className="gb-card p-3.5 space-y-2">
        <h3 className="text-xs text-[#142211]">8-Bit SFX &amp; Haptics</h3>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <button
            onClick={() => {
              const next = !sfxMuted;
              setSfxMuted(next);
              setSfxMutedState(next);
              if (!next) fx.open();
            }}
            className={`py-1.5 px-2.5 flex items-center justify-center gap-1.5 cursor-pointer ${
              !sfxMuted ? 'gb-btn-active' : 'gb-btn'
            }`}
          >
            {sfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>SFX: {sfxMuted ? 'OFF' : 'ON'}</span>
          </button>

          <button
            onClick={() => {
              const next = !hapticMuted;
              setHapticMuted(next);
              setHapticMutedState(next);
              if (!next) fx.tap();
            }}
            className={`py-1.5 px-2.5 flex items-center justify-center gap-1.5 cursor-pointer ${
              !hapticMuted ? 'gb-btn-active' : 'gb-btn'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>HAPTIC: {hapticMuted ? 'OFF' : 'ON'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
