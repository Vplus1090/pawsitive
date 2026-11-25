import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function LeaderboardTab({ currentUser }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('ranks');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [boardRes, actRes] = await Promise.all([
        api.getLeaderboard(),
        api.getActivityStream()
      ]);
      setLeaderboard(boardRes);
      setActivity(actRes);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const maxPoints = leaderboard[0]?.total_points || 100;

  const getActionLabel = (actionType) => {
    switch (actionType) {
      case 'resolve_listing': return 'Resolved Aid';
      case 'create_listing': return 'Posted Request';
      case 'photo_sighting': return 'Animal Sighting';
      case 'capture_animal': return 'Dex Capture';
      case 'post_comment': return 'Commented';
      default: return 'Deed';
    }
  };

  return (
    <div className="p-3 space-y-3 font-silkscreen">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-[#ecf7c6]">Leaderboard</h2>
        <div className="flex items-center gap-1.5 text-[9px]">
          <button
            onClick={() => setActiveSubTab('ranks')}
            className={`px-2.5 py-1 cursor-pointer ${activeSubTab === 'ranks' ? 'gb-btn-active' : 'gb-btn'}`}
          >
            RANKS
          </button>
          <button
            onClick={() => setActiveSubTab('activity')}
            className={`px-2.5 py-1 cursor-pointer ${activeSubTab === 'activity' ? 'gb-btn-active' : 'gb-btn'}`}
          >
            LOG
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-[#9bbc0f] text-[10px]">Loading...</div>
      ) : activeSubTab === 'ranks' ? (
        <div className="gb-card p-3.5 space-y-3">
          {leaderboard.map(user => {
            const isMe = currentUser?.user_id === user.user_id;
            const pct = Math.max(12, Math.round((user.total_points / maxPoints) * 100));
            return (
              <div key={user.user_id} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#306230] w-5">
                      #{user.rank}
                    </span>
                    <span className="text-[#142211] truncate">{user.name}</span>
                    {isMe && (
                      <span className="bg-[#142211] text-[#d7ee96] px-1.5 py-0.2 rounded text-[8px]">You</span>
                    )}
                  </div>
                  <span className="text-[#142211] flex-shrink-0">{user.total_points} PAW</span>
                </div>
                <div className="gb-pill-track h-3">
                  <div
                    className={`h-full transition-all duration-300 ${user.rank === 1 ? 'bg-[#306230]' : 'bg-[#7d9b3b]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="gb-card p-2 divide-y divide-[#9bbc0f]">
          {activity.map(act => (
            <div key={act.deed_id} className="px-2 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[#142211] truncate">{act.user_name}</p>
                <p className="text-[9px] text-[#306230] mt-0.5">
                  {getActionLabel(act.action_type)} · {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="bg-[#7d9b3b] text-[#ecf7c6] px-2 py-0.5 rounded-lg text-[9px] flex-shrink-0">
                +{act.points_awarded}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
