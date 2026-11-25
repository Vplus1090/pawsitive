import React, { useState, useEffect } from 'react';
import { X, Send, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { fx, createSwipeDownHandlers } from '../utils/retroFeedback';

export default function ListingDetailModal({
  listingId,
  isOpen,
  onClose,
  onUpdated
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [proofPhoto, setProofPhoto] = useState('https://upload.wikimedia.org/wikipedia/commons/3/3e/Indian_street_dog.jpg');
  const [proofHint, setProofHint] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const fetchDetails = async () => {
    if (!listingId) return;
    setLoading(true);
    try {
      const res = await api.getListingDetails(listingId);
      setData(res);
    } catch (err) {
      console.error('Fetch listing details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && listingId) {
      setIsResolving(false);
      setAiPreview(null);
      setProofHint('');
      fetchDetails();
    }
  }, [isOpen, listingId]);

  const listing = data?.listing;
  const comments = data?.comments || [];
  const isResolved = listing?.status === 'resolved';
  const resolvePaw = listing?.reward_paw_points || 100;

  const runAiPreview = async (targetProofUrl, hint = '') => {
    if (!listing || !targetProofUrl) return;
    setIsVerifyingAi(true);
    try {
      const res = await api.verifyDeed({
        originalPhotoUrl: listing.photo_url,
        originalSpeciesName: listing.species_name,
        originalDescription: listing.description,
        proofPhotoUrl: targetProofUrl,
        proofHint: hint,
        helpType: listing.help_type
      });
      setAiPreview(res);
    } catch {
      setAiPreview(null);
    } finally {
      setIsVerifyingAi(false);
    }
  };

  if (!isOpen) return null;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const res = await api.addComment(listingId, commentText.trim());
      fx.tap();
      setData(prev => ({
        ...prev,
        comments: [...(prev.comments || []), res.comment]
      }));
      setCommentText('');
      if (onUpdated) onUpdated();
    } catch (err) {
      fx.error();
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleProofUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fx.scanTick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result;
      setProofPhoto(url);
      setProofHint(file.name);
      runAiPreview(url, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleResolveSubmit = async () => {
    if (!proofPhoto) {
      fx.error();
      alert('Please provide a proof photo.');
      return;
    }
    setIsSubmittingResolve(true);
    try {
      await api.resolveListing(listingId, proofPhoto, proofHint);
      fx.success();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      setIsResolving(false);
      fetchDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      fx.error();
      alert(err.message || 'AI verification failed');
    } finally {
      setIsSubmittingResolve(false);
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
          <div className="min-w-0">
            <h3 className="text-xs text-[#142211] truncate">
              {isResolved
                ? `Deed: ${listing?.animal_nickname || listing?.species_name || 'Verified'}`
                : (listing?.animal_nickname || listing?.species_name || 'Aid Request')}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="inline-block bg-[#7d9b3b] text-[#ecf7c6] px-2 py-0.2 rounded text-[8px] uppercase">
                {!isResolved && listing?.post_kind === 'photo' ? 'PHOTO' : listing?.help_type}
              </span>
              {isResolved && (
                <span className="inline-block bg-[#306230] text-[#ecf7c6] px-2 py-0.2 rounded text-[8px] uppercase">
                  AI VERIFIED DEED
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="gb-btn w-6 h-6 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5">
          {loading ? (
            <div className="py-10 text-center text-[#306230] text-[10px]">Loading...</div>
          ) : isResolved ? (
            /* Verified Deed Post View (replaces original open listing) */
            <>
              <div className="rounded-xl border-2 border-[#142211] aspect-video overflow-hidden bg-[#142211]">
                <img
                  src={listing.resolved_photo_url || listing.photo_url}
                  alt="Verified Deed Proof"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="gb-panel-dark p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-[#d7ee96] flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AI MATCH {Math.round((listing.ai_verification_score || 0.95) * 100)}%
                  </span>
                  <span className="text-[#ecf7c6] font-bold">+{resolvePaw} PAW</span>
                </div>
                <p className="text-[10px] text-[#ecf7c6] font-pixelify">
                  {listing.ai_verification_note || 'Proof photo confirmed matching animal against original listing photo.'}
                </p>
              </div>

              <div className="gb-input p-2.5 flex items-center justify-between text-[9px] text-[#306230]">
                <span>Deed by {listing.resolver_name || 'Helper'}</span>
                <span>Sector 62</span>
              </div>
            </>
          ) : (
            /* Open Help Listing View */
            <>
              <div className="flex items-start justify-between gap-2.5 gb-input p-2.5">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-xs text-[#142211] font-pixelify leading-snug">
                    {listing.description}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] text-[#306230]">
                    <span>{listing.poster_name}</span>
                    <span>·</span>
                    <span>Sector 62</span>
                  </div>
                </div>
                <div className="w-24 h-24 flex-shrink-0 rounded-xl border-2 border-[#142211] overflow-hidden bg-[#142211]">
                  <img src={listing.photo_url} alt="Listing" className="w-full h-full object-cover" />
                </div>
              </div>

              {listing.post_kind === 'photo' ? (
                <div className="gb-panel-dark px-2.5 py-1.5 flex items-center justify-between text-[9px]">
                  <span className="text-[#d7ee96]">ANIMAL PHOTO SIGHTING</span>
                  <span className="text-[#ecf7c6] font-bold">+{listing.post_paw_points || 25} PAW</span>
                </div>
              ) : !isResolving ? (
                <button
                  onClick={() => {
                    setIsResolving(true);
                    runAiPreview(proofPhoto, proofHint);
                  }}
                  className="gb-btn-dark w-full py-2 text-[10px] cursor-pointer"
                >
                  CONFIRM DEED (+{resolvePaw} PAW)
                </button>
              ) : (
                <div className="gb-input p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span>AI Photo Check</span>
                    <button
                      onClick={() => setIsResolving(false)}
                      className="text-[#306230] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Side-by-side comparison: Original Post Photo vs Proof Photo */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-[#306230] block">ORIGINAL POST</span>
                      <div className="aspect-square rounded-lg border border-[#142211] overflow-hidden bg-[#142211]">
                        <img src={listing.photo_url} alt="Original" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-[#306230] block">YOUR PROOF</span>
                      <div className="relative aspect-square rounded-lg border border-[#142211] overflow-hidden bg-[#142211]">
                        <img src={proofPhoto} alt="Proof" className="w-full h-full object-cover" />
                        <label className="gb-btn absolute bottom-1 right-1 text-[8px] px-1.5 py-0.5 cursor-pointer flex items-center gap-0.5">
                          <Upload className="w-2.5 h-2.5" />
                          <span>Upload</span>
                          <input type="file" accept="image/*" onChange={handleProofUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* AI Verification Status */}
                  <div className="gb-panel-dark px-2 py-1.5 text-[9px]">
                    {isVerifyingAi ? (
                      <span className="text-[#d7ee96]">Comparing proof with original photo...</span>
                    ) : aiPreview ? (
                      <div className="flex items-start gap-1.5">
                        {aiPreview.verified ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#d7ee96] flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#f7c873] flex-shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-[#d7ee96]">
                            {aiPreview.verified
                              ? `AI MATCH ${Math.round(aiPreview.confidence * 100)}%`
                              : 'ANIMAL MISMATCH'}
                          </div>
                          <div className="text-[8px] text-[#ecf7c6] font-pixelify">
                            {aiPreview.reason}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={handleResolveSubmit}
                    disabled={isSubmittingResolve || (aiPreview && !aiPreview.verified)}
                    className="gb-btn-active w-full py-1.5 text-[10px] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingResolve ? 'VERIFYING...' : `VERIFY DEED +${resolvePaw} PAW`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Chat Section */}
          {!loading && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] text-[#142211]">Chat ({comments.length})</h4>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.comment_id} className="gb-input p-2">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[#142211]">{c.user_name}</span>
                      <span className="text-[#306230]">
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#142211] font-pixelify mt-0.5">{c.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Reply (+10 PAW)"
                  className="gb-input flex-1 px-2.5 py-1.5 text-xs font-pixelify focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="gb-btn-dark p-2 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
