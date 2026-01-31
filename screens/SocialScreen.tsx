import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { getStats, UserStats } from '../services/storageService';
import { configManager } from '../config';
import { STORAGE_KEYS } from '../config/constants';

type TimePeriod = 'daily' | 'weekly' | 'monthly';

interface LeaderboardUser {
  rank: number;
  name: string;
  hours: number;
  streak: number;
  points: number;
  me?: boolean;
}

const POINT_TIERS = [
  { label: 'Top 3', maxRank: 3, points: 100 },
  { label: 'Top 10', maxRank: 10, points: 50 },
  { label: 'Top 25', maxRank: 25, points: 35 },
  { label: 'Top 50', maxRank: 50, points: 20 },
  { label: 'Top 100', maxRank: 100, points: 10 },
  { label: 'Participant', maxRank: Infinity, points: 5 },
];

const getPointsForRank = (rank: number): number => {
  for (const tier of POINT_TIERS) {
    if (rank <= tier.maxRank) return tier.points;
  }
  return 5;
};

const getTierForRank = (rank: number): string => {
  for (const tier of POINT_TIERS) {
    if (rank <= tier.maxRank) return tier.label;
  }
  return 'Participant';
};

// Mock data multipliers for different time periods
const PERIOD_MULTIPLIERS: Record<TimePeriod, number> = {
  daily: 1,
  weekly: 5,
  monthly: 18,
};

export const SocialScreen: React.FC<GlobalProps> = ({ setScreen }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [userName, setUserName] = useState('You');
  const [gamificationEnabled, setGamificationEnabled] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>('weekly');

  useEffect(() => {
    const loadData = async () => {
      const statsData = await getStats();
      setStats(statsData);

      const savedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.displayName) setUserName(parsed.displayName);
      }

      const savedGamification = localStorage.getItem('tempo_gamification');
      if (savedGamification === 'true') setGamificationEnabled(true);
    };
    loadData();
  }, []);

  const toggleGamification = () => {
    const newVal = !gamificationEnabled;
    setGamificationEnabled(newVal);
    localStorage.setItem('tempo_gamification', String(newVal));
  };

  const multiplier = PERIOD_MULTIPLIERS[period];
  const myHoursTotal = Math.floor((stats?.totalFocusMinutes || 0) / 60);
  const myHours = period === 'daily' ? Math.max(1, Math.floor(myHoursTotal / 30)) : period === 'weekly' ? Math.max(1, Math.floor(myHoursTotal / 4)) : myHoursTotal;
  const myStreak = stats?.currentStreak || 0;

  const config = configManager.getConfig();
  const mockLeaderboard = config.social.mockLeaderboard;

  // Build leaderboard with period-adjusted hours
  const allUsers: LeaderboardUser[] = [
    ...mockLeaderboard.map((u) => {
      const baseHours = parseInt(u.hours) || 0;
      const adjustedHours = period === 'daily' ? Math.max(1, Math.floor(baseHours / 30)) : period === 'weekly' ? Math.max(1, Math.floor(baseHours / 4)) : baseHours;
      return {
        rank: 0,
        name: u.name,
        hours: adjustedHours,
        streak: u.streak,
        points: 0,
      };
    }),
    { rank: 0, name: userName, hours: myHours, streak: myStreak, points: 0, me: true },
  ];

  const sortedUsers = allUsers
    .sort((a, b) => b.hours - a.hours)
    .map((u, idx) => ({ ...u, rank: idx + 1, points: getPointsForRank(idx + 1) }));

  const yourRank = sortedUsers.find(u => u.me)?.rank || sortedUsers.length;
  const yourPoints = getPointsForRank(yourRank);
  const yourTier = getTierForRank(yourRank);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { color: 'text-yellow-400', icon: 'emoji_events', bg: 'bg-yellow-400/10' };
    if (rank === 2) return { color: 'text-gray-300', icon: 'military_tech', bg: 'bg-gray-300/10' };
    if (rank === 3) return { color: 'text-amber-600', icon: 'military_tech', bg: 'bg-amber-600/10' };
    return { color: 'text-muted', icon: '', bg: '' };
  };

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-md z-20 px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TIMER)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <h2 className="font-bold text-sm">Compete</h2>
        <div className="w-8"></div>
      </div>

      <div className="p-5 space-y-4">
        {/* Gamification Toggle */}
        <div
          className="bg-surface-dark rounded-xl border border-white/5 p-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
          onClick={toggleGamification}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-primary">trophy</span>
              </div>
              <div>
                <p className="text-sm font-bold">Compete Mode</p>
                <p className="text-[10px] text-muted">Share daily hours & compete with others</p>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${gamificationEnabled ? 'bg-primary' : 'bg-surface-light'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gamificationEnabled ? 'left-5' : 'left-1'}`}></div>
            </div>
          </div>
        </div>

        {gamificationEnabled ? (
          <>
            {/* Your Stats Card */}
            <div className="bg-surface-dark rounded-xl border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-xs font-bold">
                    {getInitials(userName)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{userName}</p>
                    <p className="text-[10px] text-muted">Rank #{yourRank} · {yourTier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-black text-primary">{myHours}h</p>
                    <p className="text-[9px] text-muted uppercase">Focus</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-secondary">{yourPoints}</p>
                    <p className="text-[9px] text-muted uppercase">Pts</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Period Tabs */}
            <div className="flex p-0.5 bg-surface-dark rounded-lg border border-white/5">
              {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 rounded-md text-[11px] font-semibold transition-all capitalize ${
                    period === p ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-muted hover:text-white/70'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Point Tiers Info */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {POINT_TIERS.slice(0, 4).map((tier) => (
                <div key={tier.label} className="flex-1 min-w-0 bg-surface-dark rounded-lg border border-white/5 p-2 text-center">
                  <p className="text-xs font-black text-white">{tier.points}</p>
                  <p className="text-[8px] text-muted uppercase tracking-wider">{tier.label}</p>
                </div>
              ))}
            </div>

            {/* Leaderboard */}
            <div>
              <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 ml-0.5">
                {period === 'daily' ? "Today's" : period === 'weekly' ? 'This Week' : 'This Month'} Rankings
              </h3>
              <div className="bg-surface-dark rounded-xl border border-white/5 divide-y divide-white/5">
                {sortedUsers.map((user) => {
                  const rankStyle = getRankDisplay(user.rank);
                  return (
                    <div
                      key={user.name}
                      className={`flex items-center justify-between p-3 transition-colors ${user.me ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 text-center">
                          {user.rank <= 3 ? (
                            <span className={`material-symbols-outlined text-sm ${rankStyle.color}`}>
                              {rankStyle.icon}
                            </span>
                          ) : (
                            <span className="text-sm font-black text-muted">{user.rank}</span>
                          )}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          user.me
                            ? 'bg-gradient-to-br from-teal-400 to-blue-500'
                            : 'bg-white/10'
                        }`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${user.me ? 'text-white' : 'text-white/80'}`}>
                            {user.name} {user.me && <span className="text-[10px] text-primary font-bold">(you)</span>}
                          </p>
                          <p className="text-[10px] text-muted">{user.hours}h focused</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-0.5">
                          <span className={`material-symbols-outlined text-xs ${user.streak > 0 ? 'text-secondary' : 'text-muted/30'}`}>
                            local_fire_department
                          </span>
                          <span className={`text-[10px] font-bold ${user.streak > 0 ? 'text-secondary' : 'text-muted/30'}`}>
                            {user.streak}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          +{user.points}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Disabled State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-dark border border-white/5 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-muted">leaderboard</span>
            </div>
            <h3 className="text-sm font-bold mb-1">Competition Off</h3>
            <p className="text-[11px] text-muted max-w-[220px] leading-relaxed">
              Enable Compete Mode to share your focus hours and compete with other Tempo users on daily, weekly, and monthly leaderboards.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 w-full max-w-[260px]">
              <div className="bg-surface-dark rounded-lg border border-white/5 p-2.5 text-center">
                <span className="material-symbols-outlined text-yellow-400 text-base">emoji_events</span>
                <p className="text-[9px] text-muted mt-1">Daily</p>
              </div>
              <div className="bg-surface-dark rounded-lg border border-white/5 p-2.5 text-center">
                <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
                <p className="text-[9px] text-muted mt-1">Weekly</p>
              </div>
              <div className="bg-surface-dark rounded-lg border border-white/5 p-2.5 text-center">
                <span className="material-symbols-outlined text-secondary text-base">star</span>
                <p className="text-[9px] text-muted mt-1">Monthly</p>
              </div>
            </div>
          </div>
        )}

        {/* Demo Notice */}
        <div className="bg-surface-dark/50 rounded-xl p-3.5 border border-white/5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-muted text-base mt-0.5">info</span>
            <div>
              <p className="text-xs font-semibold text-white/70 mb-0.5">Demo Mode</p>
              <p className="text-[10px] text-muted leading-relaxed">
                Social features use sample data. Your stats are real - leaderboard opponents are placeholders. Multiplayer coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
