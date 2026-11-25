import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function MascotGuide({ message, tip, onClose }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-3.5 text-white shadow-cute flex items-center gap-3 relative overflow-hidden my-3">
      {/* Decorative paw print */}
      <div className="absolute -right-3 -bottom-3 text-emerald-400 opacity-20 text-6xl pointer-events-none select-none">
        🐾
      </div>

      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl animate-mascot shadow-inner">
          🐶
        </div>
        <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
          <Sparkles className="w-2.5 h-2.5" /> Pawly
        </div>
      </div>

      <div className="flex-1 pr-6">
        <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider flex items-center gap-1">
          Community Guide
        </p>
        <p className="text-xs leading-relaxed font-medium text-white mt-0.5">
          {message || "Snap a photo of any street animal to register them in your Pokédex and earn Deed points!"}
        </p>
        {tip && (
          <p className="text-[11px] text-emerald-200 mt-1 italic">
            💡 {tip}
          </p>
        )}
      </div>

      <button
        onClick={() => {
          setDismissed(true);
          if (onClose) onClose();
        }}
        className="absolute top-2 right-2 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
