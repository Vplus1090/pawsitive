import React, { useState, useEffect, useRef } from 'react';
import PhoneFrame from './components/PhoneFrame';
import BottomNav from './components/BottomNav';
import FeedTab from './components/FeedTab';
import PokedexTab from './components/PokedexTab';
import LeaderboardTab from './components/LeaderboardTab';
import ProfileTab from './components/ProfileTab';
import CaptureModal from './components/CaptureModal';
import CreateListingModal from './components/CreateListingModal';
import ListingDetailModal from './components/ListingDetailModal';
import AnimalInspectorModal from './components/AnimalInspectorModal';
import LoginPage from './components/LoginPage';
import { api } from './api';
import { fx } from './utils/retroFeedback';

export default function App() {
  const [activeTab, setActiveTab] = useState('feed'); // 'pokedex' | 'feed' | 'leaderboard' | 'profile'
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [speciesList, setSpeciesList] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Modals & bottom chooser state
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [inspectedAnimal, setInspectedAnimal] = useState(null);

  // Phone back-gesture history stack coordination
  const historyDepthRef = useRef(0);
  const ignoringPopRef = useRef(false);
  const navStateRef = useRef({});
  navStateRef.current = {
    currentUser,
    selectedListingId,
    isCaptureOpen,
    isCreateListingOpen,
    inspectedAnimal,
    isActionMenuOpen,
    activeTab
  };

  const pushBackLayer = (layerName) => {
    try {
      window.history.pushState({ pawsitiveLayer: layerName }, '');
      historyDepthRef.current += 1;
    } catch {
      // ignore sandboxed history restrictions
    }
  };

  const popLayerWithHistory = (clearStateFn) => {
    clearStateFn();
    fx.back();
    if (historyDepthRef.current > 0) {
      historyDepthRef.current -= 1;
      ignoringPopRef.current = true;
      try {
        window.history.back();
      } catch {
        ignoringPopRef.current = false;
      }
    }
  };

  useEffect(() => {
    const onPopState = () => {
      if (ignoringPopRef.current) {
        ignoringPopRef.current = false;
        return;
      }

      historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
      const st = navStateRef.current;

      if (!st.currentUser) {
        return;
      }
      if (st.selectedListingId) {
        fx.back();
        setSelectedListingId(null);
        return;
      }
      if (st.isCaptureOpen) {
        fx.back();
        setIsCaptureOpen(false);
        return;
      }
      if (st.isCreateListingOpen) {
        fx.back();
        setIsCreateListingOpen(false);
        return;
      }
      if (st.inspectedAnimal) {
        fx.back();
        setInspectedAnimal(null);
        return;
      }
      if (st.isActionMenuOpen) {
        fx.back();
        setIsActionMenuOpen(false);
        return;
      }
      if (st.activeTab !== 'feed') {
        fx.back();
        setActiveTab('feed');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Initialize auth session (no auto-login: unregistered users stay locked on LoginPage)
  useEffect(() => {
    const initApp = async () => {
      try {
        const me = await api.getMe();
        if (me?.user) {
          setCurrentUser(me.user);
          const sp = await api.getSpecies();
          if (Array.isArray(sp)) setSpeciesList(sp);
        } else {
          api.logout();
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setAuthChecked(true);
      }
    };

    initApp();
  }, []);

  const refreshCurrentUserPoints = async () => {
    try {
      const me = await api.getMe();
      if (me?.user) setCurrentUser(me.user);
    } catch {
      // ignore
    }
  };

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    setActiveTab('feed');
    setRefreshTick(t => t + 1);
    try {
      const sp = await api.getSpecies();
      if (Array.isArray(sp)) setSpeciesList(sp);
    } catch {
      // ignore
    }
  };

  const handleSignOut = () => {
    fx.back();
    api.logout();
    setCurrentUser(null);
    setSpeciesList([]);
    setIsActionMenuOpen(false);
    setIsCaptureOpen(false);
    setIsCreateListingOpen(false);
    setSelectedListingId(null);
    setInspectedAnimal(null);
    historyDepthRef.current = 0;
    setActiveTab('feed');
    setRefreshTick(t => t + 1);
  };

  const handleNavigateTab = (nextTab) => {
    if (nextTab === activeTab) return;
    fx.tab();
    if (activeTab === 'feed' && nextTab !== 'feed') {
      pushBackLayer(`tab:${nextTab}`);
    }
    setActiveTab(nextTab);
  };

  const openActionMenu = () => {
    if (isActionMenuOpen) {
      popLayerWithHistory(() => setIsActionMenuOpen(false));
    } else {
      fx.open();
      pushBackLayer('action-menu');
      setIsActionMenuOpen(true);
    }
  };

  const closeActionMenu = () => {
    if (!isActionMenuOpen) return;
    popLayerWithHistory(() => setIsActionMenuOpen(false));
  };

  const openCaptureModal = () => {
    if (!currentUser) return;
    fx.open();
    if (isActionMenuOpen) {
      // Replace open menu layer silently in state and push capture layer
      setIsActionMenuOpen(false);
    } else {
      pushBackLayer('capture');
    }
    setIsCaptureOpen(true);
  };

  const openCreateListingModal = () => {
    if (!currentUser) return;
    fx.open();
    if (isActionMenuOpen) {
      setIsActionMenuOpen(false);
    } else {
      pushBackLayer('create-listing');
    }
    setIsCreateListingOpen(true);
  };

  const openListingModal = (listing) => {
    fx.open();
    pushBackLayer(`listing:${listing.listing_id}`);
    setSelectedListingId(listing.listing_id);
  };

  const openInspectorModal = (animal) => {
    fx.open();
    pushBackLayer(`inspector:${animal.species_id || animal.name}`);
    setInspectedAnimal(animal);
  };

  const handleAnimalCaptured = (result) => {
    if (result.reward && currentUser) {
      setCurrentUser(prev => ({
        ...prev,
        points_total: result.reward.newTotalPoints ?? prev.points_total,
        paw_points: result.reward.newPawPoints ?? prev.paw_points
      }));
    }
    setRefreshTick(t => t + 1);
    // Keep the pushed history entry for the Pokédex tab so phone Back returns to Feed
    setIsCaptureOpen(false);
    setActiveTab('pokedex');
  };

  const handleListingCreated = (result) => {
    if (result.reward && currentUser) {
      setCurrentUser(prev => ({
        ...prev,
        points_total: result.reward.newTotalPoints ?? prev.points_total,
        paw_points: result.reward.newPawPoints ?? prev.paw_points
      }));
    }
    setRefreshTick(t => t + 1);
    setActiveTab('feed');
  };

  const handleListingUpdated = () => {
    refreshCurrentUserPoints();
    setRefreshTick(t => t + 1);
  };

  return (
    <PhoneFrame
      currentUser={currentUser}
      onOpenSetup={() => handleNavigateTab('profile')}
      activeTab={activeTab}
      bottomNav={
        currentUser ? (
          <BottomNav
            activeTab={activeTab}
            setActiveTab={handleNavigateTab}
            isMenuOpen={isActionMenuOpen}
            onToggleMenu={openActionMenu}
            onCloseMenu={closeActionMenu}
            onOpenCapture={openCaptureModal}
            onOpenCreateListing={openCreateListingModal}
          />
        ) : null
      }
      overlay={
        currentUser ? (
          <>
            <CaptureModal
              isOpen={isCaptureOpen}
              onClose={() => popLayerWithHistory(() => setIsCaptureOpen(false))}
              onCaptured={handleAnimalCaptured}
              speciesList={speciesList}
            />

            <CreateListingModal
              isOpen={isCreateListingOpen}
              onClose={() => popLayerWithHistory(() => setIsCreateListingOpen(false))}
              onCreated={handleListingCreated}
              speciesList={speciesList}
            />

            <ListingDetailModal
              listingId={selectedListingId}
              isOpen={!!selectedListingId}
              currentUser={currentUser}
              onClose={() => popLayerWithHistory(() => setSelectedListingId(null))}
              onUpdated={handleListingUpdated}
            />

            <AnimalInspectorModal
              animal={inspectedAnimal}
              onClose={() => popLayerWithHistory(() => setInspectedAnimal(null))}
            />
          </>
        ) : null
      }
    >
      {/* Active View inside Phone Screen (Locked to LoginPage when unauthenticated) */}
      {!authChecked ? (
        <div className="flex-1 flex items-center justify-center font-silkscreen text-xs text-[#142211]">
          LOADING...
        </div>
      ) : !currentUser ? (
        <LoginPage onSuccess={handleAuthSuccess} />
      ) : (
        <div key={activeTab} className="w-full flex-1 min-h-0 flex flex-col anim-tab-enter">
          {activeTab === 'pokedex' && (
            <PokedexTab
              key={`dex-${refreshTick}`}
              onOpenCapture={openCaptureModal}
              onInspectAnimal={openInspectorModal}
            />
          )}

          {activeTab !== 'pokedex' && (
            <div className="flex-1 min-h-0 flex flex-col bg-[#142211] pt-[2px] sheet-16bit-clip">
              <div className="flex-1 min-h-0 flex flex-col bg-[#7d9b3b] pt-[3px] sheet-16bit-clip">
                <div className="flex-1 min-h-0 flex flex-col bg-[#2b4220] pt-[3px] sheet-16bit-clip">
                  <div className="flex-1 min-h-0 overflow-y-auto bg-[#142211] pt-3 pb-24 sheet-16bit-clip">
                    {activeTab === 'feed' && (
                      <FeedTab
                        key={`feed-${refreshTick}`}
                        onOpenCreateListing={openCreateListingModal}
                        onSelectListing={openListingModal}
                      />
                    )}

                    {activeTab === 'leaderboard' && (
                      <LeaderboardTab
                        key={`board-${refreshTick}`}
                        currentUser={currentUser}
                      />
                    )}

                    {activeTab === 'profile' && (
                      <ProfileTab
                        key={`prof-${refreshTick}`}
                        currentUser={currentUser}
                        onSignOut={handleSignOut}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PhoneFrame>
  );
}
