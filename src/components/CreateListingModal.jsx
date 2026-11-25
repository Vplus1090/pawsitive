import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { getPostPawPoints, getResolvePawPoints, getPhotoPostPawPoints } from '../../shared/pawPoints';
import { fx, createSwipeDownHandlers } from '../utils/retroFeedback';

const POST_MODES = [
  { id: 'request', label: 'NEED HELP' },
  { id: 'deed', label: 'DEED DONE' },
  { id: 'photo', label: 'PHOTO ONLY' }
];

const HELP_TYPES = [
  { id: 'feed', label: 'FEED' },
  { id: 'shelter', label: 'SHELTER' },
  { id: 'vaccine', label: 'VACCINE' },
  { id: 'clothes', label: 'CLOTHES' },
  { id: 'rescue', label: 'RESCUE' },
  { id: 'adoption', label: 'ADOPT' }
];

const PRESET_PHOTOS = [
  { name: 'Dog', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600', hint: 'dog' },
  { name: 'Parrot', url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600', hint: 'parrot' },
  { name: 'Butterfly', url: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600', hint: 'butterfly' },
  { name: 'Gecko', url: 'https://images.unsplash.com/photo-1504450874802-0ba2bcd9b5ae?w=600', hint: 'gecko' }
];

export default function CreateListingModal({ isOpen, onClose, onCreated, speciesList = [] }) {
  const [postMode, setPostMode] = useState('request');
  const [helpType, setHelpType] = useState('feed');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState(PRESET_PHOTOS[0].url);
  const [nickname, setNickname] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [pokedexBySpecies, setPokedexBySpecies] = useState({});
  const [locationName, setLocationName] = useState('Sector 62, Noida');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runClassification = async (url, hint = '') => {
    setIsClassifying(true);
    try {
      const result = await api.classifySpecies(hint, '', url);
      setPrediction(result);
      if (result.species_id) {
        setSelectedSpeciesId(String(result.species_id));
      }
    } catch (err) {
      console.error('Classification error:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setPostMode('request');
    setPhotoUrl(PRESET_PHOTOS[0].url);
    setNickname('');
    setDescription('');
    runClassification(PRESET_PHOTOS[0].url, 'dog');
    api.getPokedex().then((data) => {
      const map = {};
      (data?.pokedex || []).forEach((s) => {
        map[s.species_id] = s;
      });
      setPokedexBySpecies(map);
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const existingSpecies = selectedSpeciesId ? pokedexBySpecies[Number(selectedSpeciesId)] : null;
  const isNewAnimal = !existingSpecies || !existingSpecies.isCaptured;
  const currentLevel = existingSpecies?.level || 0;
  const nextScans = (existingSpecies?.captureCount || 0) + 1;
  const nextLevel = Math.ceil(nextScans / 2);
  const pawGain =
    postMode === 'deed'
      ? getResolvePawPoints(helpType, isNewAnimal)
      : postMode === 'photo'
        ? getPhotoPostPawPoints(isNewAnimal)
        : getPostPawPoints(helpType, isNewAnimal);

  const handleSelectPreset = (preset) => {
    fx.scanTick();
    setPhotoUrl(preset.url);
    runClassification(preset.url, preset.hint);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fx.scanTick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setPhotoUrl(base64);
      runClassification(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      fx.error();
      alert('Please provide a photo');
      return;
    }
    if (postMode === 'request' && !description.trim()) {
      fx.error();
      alert('Please describe what help is needed (or switch to Photo Only / Deed Done)');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.createListing({
        post_kind: postMode,
        help_type: helpType,
        description: description.trim(),
        photo_url: photoUrl,
        species_id: selectedSpeciesId ? Number(selectedSpeciesId) : undefined,
        nickname: nickname.trim() || undefined,
        predicted_species: prediction?.predicted_species,
        confidence: prediction?.confidence,
        latitude: 28.6304 + (Math.random() - 0.5) * 0.005,
        longitude: 77.3721 + (Math.random() - 0.5) * 0.005
      });

      fx.success();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      if (onCreated) onCreated(result);
      onClose();
    } catch (err) {
      fx.error();
      alert(err.message || 'Failed to post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const swipeHandlers = createSwipeDownHandlers(onClose);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="absolute inset-0 bg-black/75 z-50 flex items-end justify-center p-2.5 pb-3 font-silkscreen anim-backdrop-in"
    >
      <div className="gb-card w-full flex flex-col max-h-[88%] overflow-hidden p-3.5 space-y-2.5 anim-sheet-up">
        <div {...swipeHandlers} className="flex items-center justify-between touch-pan-y">
          <span className="text-xs text-[#142211]">Post to Feed &amp; Dex</span>
          <button
            onClick={onClose}
            className="gb-btn w-6 h-6 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-2">
          {/* Post Mode Switcher: Aid Request | Direct Deed | Photo Only */}
          <div className="grid grid-cols-3 gap-1.5">
            {POST_MODES.map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => { fx.tap(); setPostMode(mode.id); }}
                className={`py-1.5 text-[9px] font-bold cursor-pointer ${
                  postMode === mode.id ? 'gb-btn-dark' : 'gb-btn'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Help/Deed Type Selector (hidden for photo-only sighting) */}
          {postMode !== 'photo' && (
            <div className="grid grid-cols-3 gap-1.5">
              {HELP_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => { fx.tap(); setHelpType(type.id); }}
                  className={`py-1.5 text-[9px] cursor-pointer ${
                    helpType === type.id ? 'gb-btn-active' : 'gb-btn'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative aspect-video rounded-xl border-2 border-[#142211] overflow-hidden bg-[#142211]">
            <img src={photoUrl} alt="Listing preview" className="w-full h-full object-cover" />
            {isClassifying && (
              <div className="absolute inset-0 bg-[#142211]/70 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-x-0 h-5 bg-[#9bbc0f]/35 anim-radar-sweep pointer-events-none" />
                <span className="relative z-10 text-[10px] text-[#d7ee96]">Detecting species...</span>
              </div>
            )}
            <label className="gb-btn absolute bottom-1.5 right-1.5 text-[9px] px-2 py-1 cursor-pointer flex items-center gap-1">
              <Upload className="w-3 h-3" />
              <span>Photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Preset animal quick picks */}
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_PHOTOS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`py-1 px-1 text-[9px] cursor-pointer ${
                  photoUrl === preset.url ? 'gb-btn-active' : 'gb-btn'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Dex Detection Banner: New Animal vs New Version */}
          {selectedSpeciesId && (
            <div className="gb-panel-dark px-2.5 py-1.5 flex items-center justify-between text-[9px]">
              <span className="text-[#d7ee96] font-bold">
                {isNewAnimal
                  ? `NEW ANIMAL! · DEX LV.${nextLevel}`
                  : `NEW VERSION! · LV.${currentLevel}->${nextLevel}`}
              </span>
              <span className="text-[#ecf7c6]">+{pawGain} PAW</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[9px] text-[#142211] block mb-0.5">Species</label>
              <select
                value={selectedSpeciesId}
                onChange={(e) => setSelectedSpeciesId(e.target.value)}
                className="gb-input w-full px-2 py-1 text-[10px] focus:outline-none"
              >
                <option value="" disabled>Auto detect</option>
                {speciesList.map((sp) => (
                  <option key={sp.species_id} value={sp.species_id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-[#142211] block mb-0.5">Version Name</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Sheru"
                className="gb-input w-full px-2 py-1 text-[10px] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] text-[#142211] block">
              {postMode === 'photo'
                ? 'Caption (optional)'
                : postMode === 'deed'
                  ? 'Deed Summary (optional)'
                  : 'Details'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                postMode === 'photo'
                  ? 'Optional animal note...'
                  : postMode === 'deed'
                    ? 'e.g. Fed Sheru clean water & biscuits'
                    : 'Describe what help is needed'
              }
              className="gb-input w-full px-2.5 py-1.5 text-xs font-pixelify focus:outline-none"
              required={postMode === 'request'}
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] text-[#142211] block">Location</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="gb-input w-full px-2.5 py-1 text-[10px] focus:outline-none"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="gb-btn flex-1 py-1.5 text-[10px] cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gb-btn-dark flex-[2] py-1.5 text-[10px] disabled:opacity-50 cursor-pointer"
          >
            POST +{pawGain} PAW
          </button>
        </div>
      </div>
    </div>
  );
}
