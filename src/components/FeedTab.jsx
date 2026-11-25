import React, { useState, useEffect } from 'react';
import { MapPin, MessageSquare, Plus, List, Map as MapIcon, ShieldCheck } from 'lucide-react';
import MapView from './MapView';
import { api } from '../api';
import { fx } from '../utils/retroFeedback';

const HELP_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'feed', label: 'FEED' },
  { id: 'shelter', label: 'SHELTER' },
  { id: 'rescue', label: 'RESCUE' },
  { id: 'clothes', label: 'CLOTHES' },
  { id: 'vaccine', label: 'VACCINE' },
  { id: 'adoption', label: 'ADOPT' }
];

export default function FeedTab({ onOpenCreateListing, onSelectListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeHelpType, setActiveHelpType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const data = await api.getListings(activeHelpType, activeStatus, searchQuery);
      setListings(data);
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [activeHelpType, activeStatus, searchQuery]);

  return (
    <div className="p-3 space-y-3 font-silkscreen">
      {/* Search + Map Toggle + New */}
      <div className="flex items-center gap-1.5">
        <div className="gb-input flex-1 px-2.5 py-1.5 flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search aid"
            className="w-full text-[11px] text-[#142211] bg-transparent focus:outline-none placeholder:text-[#658432]"
          />
        </div>

        <button
          onClick={() => { fx.tap(); setViewMode(viewMode === 'list' ? 'map' : 'list'); }}
          className={`p-2 cursor-pointer ${viewMode === 'map' ? 'gb-btn-active' : 'gb-btn'}`}
          title={viewMode === 'list' ? 'Map View' : 'List View'}
        >
          {viewMode === 'list' ? <MapIcon className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onOpenCreateListing}
          className="gb-btn-active px-2.5 py-1.5 text-[10px] flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> NEW
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {HELP_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { fx.tap(); setActiveHelpType(f.id); }}
            className={`px-2.5 py-1 text-[9px] whitespace-nowrap cursor-pointer ${
              activeHelpType === f.id ? 'gb-btn-active' : 'gb-btn'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Status Filter Strip */}
      <div className="flex items-center gap-1.5 text-[9px]">
        <button
          onClick={() => { fx.tap(); setActiveStatus('all'); }}
          className={`flex-1 py-1 cursor-pointer ${activeStatus === 'all' ? 'gb-btn-active' : 'gb-btn'}`}
        >
          ALL ({listings.length})
        </button>
        <button
          onClick={() => { fx.tap(); setActiveStatus('open'); }}
          className={`flex-1 py-1 cursor-pointer ${activeStatus === 'open' ? 'gb-btn-active' : 'gb-btn'}`}
        >
          OPEN ({listings.filter(l => l.status === 'open').length})
        </button>
        <button
          onClick={() => { fx.tap(); setActiveStatus('resolved'); }}
          className={`flex-1 py-1 cursor-pointer ${activeStatus === 'resolved' ? 'gb-btn-active' : 'gb-btn'}`}
        >
          DEEDS ({listings.filter(l => l.status === 'resolved').length})
        </button>
      </div>

      {/* Map or Game Boy Aid / Deed Cards */}
      {viewMode === 'map' ? (
        <div className="gb-card p-1.5">
          <MapView listings={listings} onSelectListing={onSelectListing} />
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="py-10 text-center text-[#9bbc0f] text-[10px]">Loading...</div>
          ) : listings.length === 0 ? (
            <div className="gb-card p-5 text-center space-y-2">
              <p className="text-[11px] text-[#142211]">No requests found</p>
              <button
                onClick={onOpenCreateListing}
                className="gb-btn-active px-3 py-1.5 text-[10px] cursor-pointer"
              >
                NEW REQUEST
              </button>
            </div>
          ) : (
            listings.map(item => {
              const isResolved = item.status === 'resolved';
              const displayPhoto = isResolved
                ? (item.resolved_photo_url || item.photo_url)
                : item.photo_url;
              const matchPct = Math.round((item.ai_verification_score || 0.95) * 100);
              const pawReward = item.reward_paw_points || 100;

              return (
                <div
                  key={item.listing_id}
                  onClick={() => onSelectListing(item)}
                  className="gb-card p-3 cursor-pointer space-y-2 hover:brightness-95 transition"
                >
                  {/* Main Split: Left text, Right smaller photo */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex-1 min-w-0 space-y-1">
                      {isResolved ? (
                        <>
                          <div className="flex items-center gap-1 text-[9px] text-[#306230] font-bold">
                            <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate uppercase">
                              {item.animal_nickname || item.species_name || 'Animal'} · DEED
                            </span>
                          </div>
                          <p className="text-[11px] text-[#142211] font-pixelify leading-snug line-clamp-3">
                            AI confirmed {item.help_type} deed ({matchPct}% match vs original photo).
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] text-[#142211] font-pixelify line-clamp-4 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="w-20 h-20 flex-shrink-0 rounded-xl border-2 border-[#142211] overflow-hidden bg-[#142211]">
                      <img
                        src={displayPhoto}
                        alt={isResolved ? 'Verified deed' : 'Listing'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Separate Chips: Location, Comments, and System PawPoints */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 bg-[#edf7c8] border border-[#142211] rounded-lg px-2 py-0.5 text-[9px] text-[#142211]">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>Sector 62</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#edf7c8] border border-[#142211] rounded-lg px-2 py-0.5 text-[9px] text-[#142211]">
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>{item.comment_count}</span>
                      </span>
                    </div>

                    <span className="inline-flex items-center bg-[#142211] text-[#d7ee96] rounded-lg px-2 py-0.5 text-[9px] font-bold">
                      +{pawReward} PAW
                    </span>
                  </div>

                  {/* Bottom Bar: Posted By / Deed By left, Category & Verified Tags right */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#9bbc0f] text-[9px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={isResolved ? (item.resolver_avatar || item.poster_avatar) : item.poster_avatar}
                        alt={isResolved ? (item.resolver_name || item.poster_name) : item.poster_name}
                        className="w-4 h-4 rounded object-cover border border-[#142211] flex-shrink-0"
                      />
                      <span className="text-[#142211] truncate">
                        {isResolved
                          ? `Deed by ${item.resolver_name || item.poster_name}`
                          : item.poster_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isResolved && (
                        <span className="bg-[#306230] text-[#ecf7c6] px-1.5 py-0.5 rounded-md text-[8px] uppercase">
                          AI VERIFIED
                        </span>
                      )}
                      <span className="bg-[#7d9b3b] text-[#ecf7c6] px-2 py-0.5 rounded-md text-[8px] uppercase">
                        {!isResolved && item.post_kind === 'photo' ? 'PHOTO' : item.help_type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
