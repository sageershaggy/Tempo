import React, { useState, useEffect, useMemo } from 'react';
import { Screen, GlobalProps } from '../types';
import { getStats, UserStats } from '../services/storageService';
import { configManager } from '../config';
import { STORAGE_KEYS } from '../config/constants';

type TimePeriod = 'daily' | 'weekly' | 'monthly';

interface LeaderboardUser {
  rank: number;
  name: string;
  minutes: number; // Track minutes for accuracy
  streak: number;
  points: number;
  me?: boolean;
}

// Rank bonus points (awarded based on leaderboard position)
const RANK_BONUS = [
  { label: 'Top 3', maxRank: 3, bonus: 100 },
  { label: 'Top 10', maxRank: 10, bonus: 50 },
  { label: 'Top 25', maxRank: 25, bonus: 35 },
  { label: 'Top 50', maxRank: 50, bonus: 20 },
];

// Calculate points from focus time:
// - 1 point per 10 minutes
// - +2 bonus points per full hour
const calculatePointsFromMinutes = (minutes: number): number => {
  const basePoints = Math.floor(minutes / 10); // 1 point per 10 mins
  const hourBonus = Math.floor(minutes / 60) * 2; // +2 per hour
  return basePoints + hourBonus;
};

const getRankBonus = (rank: number): number => {
  for (const tier of RANK_BONUS) {
    if (rank <= tier.maxRank) return tier.bonus;
  }
  return 0;
};

const getTierForRank = (rank: number): string => {
  for (const tier of RANK_BONUS) {
    if (rank <= tier.maxRank) return tier.label;
  }
  return 'Top 100';
};

// Format minutes as "Xh Ym" or "Ym"
const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
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

  const config = configManager.getConfig();
  const mockLeaderboard = config.social.mockLeaderboard;
  const myStreak = stats?.currentStreak || 0;

  // Calculate user's minutes for the selected period - recalculates when period or stats change
  const myMinutes = useMemo(() => {
    if (!stats?.weeklyData) return 0;

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');

    if (period === 'daily') {
      // Just today's minutes
      return stats.weeklyData[todayStr] || 0;
    } else if (period === 'weekly') {
      // Last 7 days
      let total = 0;
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-CA');
        total += stats.weeklyData[dateStr] || 0;
      }
      return total;
    } else {
      // Monthly - last 30 days
      let total = 0;
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-CA');
        total += stats.weeklyData[dateStr] || 0;
      }
      return total;
    }
  }, [period, stats]);

  const myPoints = calculatePointsFromMinutes(myMinutes);

  // Build leaderboard with period-adjusted minutes - recalculates when period changes
  const { sortedUsers, yourRank, yourTotalPoints, yourTier } = useMemo(() => {
    const allUsers: LeaderboardUser[] = [
      ...mockLeaderboard.map((u) => {
        const baseHours = parseInt(u.hours) || 0;
        const baseMinutes = baseHours * 60;
        // Adjust mock data for period - daily gets ~1/30, weekly gets ~1/4 of monthly
        const adjustedMinutes = period === 'daily'
          ? Math.max(30, Math.floor(baseMinutes / 30)) // At least 30 mins for daily
          : period === 'weekly'
            ? Math.max(60, Math.floor(baseMinutes / 4)) // At least 1h for weekly
            : baseMinutes;
        return {
          rank: 0,
          name: u.name,
          minutes: adjustedMinutes,
          streak: u.streak,
          points: calculatePointsFromMinutes(adjustedMinutes),
        };
      }),
      { rank: 0, name: userName, minutes: myMinutes, streak: myStreak, points: myPoints, me: true },
    ];

    // Sort by points (which reflects time spent)
    const sorted = allUsers
      .sort((a, b) => b.points - a.points)
      .map((u, idx) => ({
        ...u,
        rank: idx + 1,
        // Add rank bonus to points
        points: u.points + getRankBonus(idx + 1)
      }));

    const yourEntry = sorted.find(u => u.me);
    return {
      sortedUsers: sorted,
      yourRank: yourEntry?.rank || sorted.length,
      yourTotalPoints: yourEntry?.points || myPoints,
      yourTier: getTierForRank(yourEntry?.rank || sorted.length)
    };
  }, [period, mockLeaderboard, userName, myMinutes, myStreak, myPoints]);

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
                    <p className="text-base font-black text-primary">{formatTime(myMinutes)}</p>
                    <p className="text-[9px] text-muted uppercase">Focus</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-secondary">{yourTotalPoints}</p>
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

            {/* Points Info */}
            <div className="bg-surface-dark rounded-xl border border-white/5 p-3">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">How Points Work</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">1</span>
                  <span className="text-white/70">per 10 min focused</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-secondary/20 flex items-center justify-center text-secondary font-bold">+2</span>
                  <span className="text-white/70">bonus per hour</span>
                </div>
              </div>
            </div>

            {/* Rank Bonus Tiers */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {RANK_BONUS.map((tier) => (
                <div key={tier.label} className="flex-1 min-w-0 bg-surface-dark rounded-lg border border-white/5 p-2 text-center">
                  <p className="text-xs font-black text-white">+{tier.bonus}</p>
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
                          <p className="text-[10px] text-muted">{formatTime(user.minutes)} focused</p>
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
