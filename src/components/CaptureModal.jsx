import React, { useState, useEffect } from 'react';
import { X, Upload, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { getScanPawPoints } from '../../shared/pawPoints';
import { fx, createSwipeDownHandlers } from '../utils/retroFeedback';

const PRESET_PHOTOS = [
  { name: 'Dog', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600', hint: 'dog' },
  { name: 'Parrot', url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600', hint: 'parrot' },
  { name: 'Butterfly', url: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600', hint: 'butterfly' },
  { name: 'Gecko', url: 'https://images.unsplash.com/photo-1504450874802-0ba2bcd9b5ae?w=600', hint: 'gecko' }
];

export default function CaptureModal({ isOpen, onClose, onCaptured, speciesList = [] }) {
  const [photoUrl, setPhotoUrl] = useState(PRESET_PHOTOS[0].url);
  const [nickname, setNickname] = useState('Sheru');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [pokedexBySpecies, setPokedexBySpecies] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runAiClassification = async (url, hint = '') => {
    setIsClassifying(true);
    setPrediction(null);
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
    if (isOpen) {
      setPhotoUrl(PRESET_PHOTOS[0].url);
      setNickname('Sheru');
      runAiClassification(PRESET_PHOTOS[0].url, 'dog');
      api.getPokedex().then((data) => {
        const map = {};
        (data?.pokedex || []).forEach((s) => {
          map[s.species_id] = s;
        });
        setPokedexBySpecies(map);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const existingSpecies = selectedSpeciesId ? pokedexBySpecies[Number(selectedSpeciesId)] : null;
  const isNewAnimal = !existingSpecies || !existingSpecies.isCaptured;
  const currentLevel = existingSpecies?.level || 0;
  const nextScans = (existingSpecies?.captureCount || 0) + 1;
  const nextLevel = Math.ceil(nextScans / 2);
  const pawGain = getScanPawPoints(isNewAnimal);

  const handleSelectPreset = (preset) => {
    fx.scanTick();
    setPhotoUrl(preset.url);
    setNickname(preset.name);
    runAiClassification(preset.url, preset.hint);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fx.scanTick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setPhotoUrl(base64);
      runAiClassification(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureSubmit = async () => {
    if (!selectedSpeciesId || !photoUrl) return;
    setIsSubmitting(true);
    try {
      const result = await api.captureAnimal({
        nickname: nickname.trim() || 'Specimen',
        species_id: Number(selectedSpeciesId),
        photo_url: photoUrl,
        latitude: 28.6304 + (Math.random() - 0.5) * 0.008,
        longitude: 77.3721 + (Math.random() - 0.5) * 0.008,
        predicted_species: prediction?.predicted_species || 'Animal',
        confidence: prediction?.confidence || 0.95
      });

      fx.success();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      if (onCaptured) {
        onCaptured(result);
      } else {
        onClose();
      }
    } catch (err) {
      fx.error();
      alert(err.message || 'Capture failed');
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
          <span className="text-xs text-[#142211]">Scan to Dex</span>
          <button
            onClick={onClose}
            className="gb-btn w-6 h-6 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2.5">
          <div className="relative aspect-video rounded-xl border-2 border-[#142211] overflow-hidden bg-[#142211]">
            <img src={photoUrl} alt="Capture" className="w-full h-full object-cover" />
            {isClassifying && (
              <div className="absolute inset-0 bg-[#142211]/75 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-x-0 h-5 bg-[#9bbc0f]/35 anim-radar-sweep pointer-events-none" />
                <span className="relative z-10 text-[10px] text-[#d7ee96]">Scanning...</span>
              </div>
            )}
          </div>

          {prediction && !isClassifying && (
            <div className="gb-pill-track h-6 flex items-center justify-between px-2.5 text-[10px]">
              <div className="absolute inset-y-0 left-0 bg-[#7d9b3b]" style={{ width: `${Math.round(prediction.confidence * 100)}%` }} />
              <span className="relative z-10 text-[#ecf7c6]">AI: {prediction.predicted_species}</span>
              <span className="relative z-10 text-[#142211] font-bold">{Math.round(prediction.confidence * 100)}%</span>
            </div>
          )}

          {selectedSpeciesId && (
            <div className="gb-panel-dark px-2.5 py-1.5 flex items-center justify-between text-[9px]">
              <span className="text-[#d7ee96] font-bold">
                {isNewAnimal
                  ? `NEW ANIMAL · LV.${nextLevel}`
                  : `LEVEL UP · LV.${currentLevel}->${nextLevel}`}
              </span>
              <span className="text-[#ecf7c6]">+{pawGain} PAW</span>
            </div>
          )}

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

          <label className="gb-btn w-full py-1.5 px-3 text-[10px] cursor-pointer flex items-center justify-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
          </label>

          <div className="space-y-1">
            <label className="text-[10px] text-[#142211] block">Animal name</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter animal name"
              className="gb-input w-full px-2.5 py-1.5 text-[11px] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-[#142211] block">Species</label>
            <select
              value={selectedSpeciesId}
              onChange={(e) => setSelectedSpeciesId(e.target.value)}
              className="gb-input w-full px-2 py-1.5 text-[11px] focus:outline-none"
            >
              <option value="" disabled>Select species</option>
              {speciesList.map((sp) => (
                <option key={sp.species_id} value={sp.species_id}>
                  {sp.name} ({sp.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="gb-btn flex-1 py-1.5 text-[10px] cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleCaptureSubmit}
            disabled={isSubmitting || !selectedSpeciesId}
            className="gb-btn-dark flex-[2] py-1.5 text-[10px] flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>SCAN +{pawGain} PAW</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
