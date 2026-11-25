import React, { useState } from 'react';
import { Eye, EyeOff, Upload, LogIn, UserPlus, AlertTriangle, Lock } from 'lucide-react';
import { PixelAnimalSprite, PixelHabitatBg } from './PixelSprites';
import { TRAINER_SPRITE_PRESETS } from '../../shared/trainerSprites';
import { api } from '../api';
import { fx } from '../utils/retroFeedback';

export default function LoginPage({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => localStorage.getItem('pawsitive_saved_email') || '');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(true);
  const [location, setLocation] = useState('Sector 62, Noida');
  const [avatarUrl, setAvatarUrl] = useState(TRAINER_SPRITE_PRESETS[0].url);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fx.tap();
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'login') {
      if (!email.trim() || !password) {
        fx.error();
        setErrorMsg('Enter registered email and password.');
        return;
      }
    } else {
      if (name.trim().length < 2) {
        fx.error();
        setErrorMsg('Name must be at least 2 characters.');
        return;
      }
      if (!email.includes('@')) {
        fx.error();
        setErrorMsg('Enter a valid email address.');
        return;
      }
      if (password.length < 4) {
        fx.error();
        setErrorMsg('Password must be at least 4 characters.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const data = mode === 'login'
        ? await api.login(email.trim(), password)
        : await api.register(name.trim(), email.trim(), password, location.trim(), avatarUrl);

      if (rememberLogin) {
        localStorage.setItem('pawsitive_saved_email', email.trim());
      } else {
        localStorage.removeItem('pawsitive_saved_email');
      }

      fx.success();
      if (onSuccess) onSuccess(data.user);
    } catch (err) {
      fx.error();
      setErrorMsg(err.message || (mode === 'login' ? 'Sign in failed' : 'Create account failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col font-silkscreen anim-tab-enter">
      {/* Extended Upper Habitat Hero */}
      <div className="flex-1 min-h-[150px] bg-[#e3f4ae] px-4 pt-4 pb-5 relative overflow-hidden flex flex-col justify-between">
        <PixelHabitatBg className="absolute inset-0 w-full h-full pointer-events-none" />
        <div className="relative z-10 space-y-2 text-[#142211]">
          <span className="inline-flex items-center gap-1 bg-[#142211] text-[#d7ee96] px-2.5 py-0.5 rounded-lg text-[8px] font-bold">
            <Lock className="w-2.5 h-2.5" /> REGISTERED ONLY
          </span>
          <h1 className="font-press-start text-base leading-snug text-[#142211]">
            TRAINER GATE
          </h1>
          <p className="text-xs font-pixelify text-[#22381c] leading-snug max-w-[230px]">
            Sign in or create an account to unlock Feed, Pokédex &amp; Deeds.
          </p>
        </div>

        <div className="relative z-10 flex items-end justify-end gap-2 pt-2">
          <PixelAnimalSprite species="Cat" className="w-16 h-16 flex-shrink-0 opacity-95 anim-sprite-idle" />
          <PixelAnimalSprite species="Dog" className="w-24 h-24 flex-shrink-0 anim-sprite-idle" />
        </div>
      </div>

      {/* 16-Bit Beveled Dark Rounded Auth Sheet Hugging Bottom Card */}
      <div className="flex-shrink-0 max-h-[72%] flex flex-col bg-[#142211] pt-[2px] sheet-16bit-clip">
        <div className="flex-1 min-h-0 flex flex-col bg-[#7d9b3b] pt-[3px] sheet-16bit-clip">
          <div className="flex-1 min-h-0 flex flex-col bg-[#2b4220] pt-[3px] sheet-16bit-clip">
            <div className="flex-1 min-h-0 overflow-y-auto bg-[#142211] px-3 pt-4 pb-3 flex flex-col sheet-16bit-clip">
              <div className="gb-card p-3.5 space-y-3 anim-sheet-up">
                {/* Mode Toggle Tabs */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { fx.tap(); setMode('login'); setErrorMsg(''); }}
                    className={`py-2 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'login' ? 'gb-btn-dark' : 'gb-btn'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>SIGN IN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { fx.tap(); setMode('register'); setErrorMsg(''); }}
                    className={`py-2 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'register' ? 'gb-btn-dark' : 'gb-btn'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>CREATE</span>
                  </button>
                </div>

                {errorMsg && (
                  <div className="bg-[#142211] border-2 border-[#7d9b3b] rounded-xl px-2.5 py-2 flex items-center gap-2 text-[9px] text-[#f7c873]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-pixelify text-xs leading-tight">{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-2.5">
                  {mode === 'register' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] text-[#142211] block">Trainer Sprite</label>
                        <div className="flex items-center gap-2">
                          {TRAINER_SPRITE_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => { fx.tap(); setAvatarUrl(preset.url); }}
                              title={preset.label}
                              className={`w-10 h-10 p-[2px] pixel-circle cursor-pointer transition ${
                                avatarUrl === preset.url ? 'bg-[#142211] scale-105' : 'bg-[#7d9b3b] opacity-80'
                              }`}
                            >
                              <img src={preset.url} alt={preset.label} className="w-full h-full object-cover pixel-circle" />
                            </button>
                          ))}
                          <label className="gb-btn px-2 py-1.5 text-[8px] cursor-pointer flex items-center gap-1 ml-auto">
                            <Upload className="w-3 h-3" />
                            <span>Photo</span>
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] text-[#142211] block">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your name"
                          className="gb-input w-full px-2.5 py-2 text-xs font-pixelify focus:outline-none"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-[#142211] block">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@pawsitive.app"
                      className="gb-input w-full px-2.5 py-2 text-xs font-pixelify focus:outline-none"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-[#142211] block">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'login' ? 'Enter password' : 'Min 4 characters'}
                        className="gb-input w-full px-2.5 py-2 pr-9 text-xs font-pixelify focus:outline-none"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => { fx.tap(); setShowPassword(p => !p); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#306230] cursor-pointer"
                        aria-label="Toggle password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-0.5">
                      <label className="text-[9px] text-[#142211] block">Neighborhood</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Sector 62, Noida"
                        className="gb-input w-full px-2.5 py-2 text-xs font-pixelify focus:outline-none"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-[9px] text-[#142211] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberLogin}
                      onChange={(e) => { fx.tap(); setRememberLogin(e.target.checked); }}
                      className="w-3.5 h-3.5 accent-[#142211] cursor-pointer"
                    />
                    <span>Remember login</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="gb-btn-dark w-full py-2.5 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting
                      ? 'VERIFYING...'
                      : (mode === 'login' ? 'UNLOCK PAWSITIVE' : 'CREATE ACCOUNT')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
