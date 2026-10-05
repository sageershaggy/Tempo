import React, { useState, useEffect, useMemo } from 'react';
import { Screen, GlobalProps } from '../types';
import { getStats, UserStats } from '../services/storageService';
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

// Calculate points from focus time:
// - 1 point per 10 minutes
// - +2 bonus points per full hour
const calculatePointsFromMinutes = (minutes: number): number => {
  const basePoints = Math.floor(minutes / 10); // 1 point per 10 mins
  const hourBonus = Math.floor(minutes / 60) * 2; // +2 per hour
  return basePoints + hourBonus;
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

  const myStreak = stats?.currentStreak || 0;

  // How many days make up one unit of the selected period.
  const PERIOD_DAYS: Record<TimePeriod, number> = { daily: 1, weekly: 7, monthly: 30 };

  /** Sums real focus minutes over one period window, `offset` periods back. */
  const sumPeriod = (
    weekly: Record<string, number> | undefined,
    days: number,
    offset: number
  ): number => {
    if (!weekly) return 0;
    const today = new Date();
    let total = 0;
    for (let i = offset * days; i < offset * days + days; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      total += weekly[day.toLocaleDateString('en-CA')] || 0;
    }
    return total;
  };

  const myMinutes = useMemo(
    () => sumPeriod(stats?.weeklyData, PERIOD_DAYS[period], 0),
    [period, stats]
  );

  const myPoints = calculatePointsFromMinutes(myMinutes);

  const periodLabel = (offset: number): string => {
    if (period === 'daily') {
      return offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : `${offset} days ago`;
    }
    if (period === 'weekly') {
      return offset === 0 ? 'This week' : offset === 1 ? 'Last week' : `${offset} weeks ago`;
    }
    return offset === 0 ? 'This month' : offset === 1 ? 'Last month' : `${offset} months ago`;
  };

  // You are ranked against your own history, because that is the only real data
  // that exists. Tempo has no server, so it cannot know what anyone else has
  // focused. This board used to mix the user's genuine minutes with six invented
  // people hard-coded in config/appConfig.ts, which made the rank meaningless.
  const HISTORY_LENGTH = 6;

  const { sortedUsers, yourRank, yourTotalPoints, yourTier } = useMemo(() => {
    const days = PERIOD_DAYS[period];

    const rows: LeaderboardUser[] = Array.from({ length: HISTORY_LENGTH }, (_, offset) => {
      const minutes = sumPeriod(stats?.weeklyData, days, offset);
      return {
        rank: 0,
        name: periodLabel(offset),
        minutes,
        streak: offset === 0 ? myStreak : 0,
        points: calculatePointsFromMinutes(minutes),
        me: offset === 0,
      };
    });

    const sorted = [...rows]
      .sort((a, b) => b.minutes - a.minutes)
      .map((u, idx) => ({ ...u, rank: idx + 1 }));

    const mine = sorted.find((u) => u.me);
    const rank = mine?.rank || HISTORY_LENGTH;
    const best = Math.max(...rows.map((r) => r.minutes), 0);
    const unit = period === 'daily' ? 'days' : period === 'weekly' ? 'weeks' : 'months';
    const one = unit.slice(0, -1);

    return {
      sortedUsers: sorted,
      yourRank: rank,
      // Points come straight from real minutes. The old board added a rank
      // bonus for outscoring people who do not exist.
      yourTotalPoints: myPoints,
      yourTier:
        best > 0 && rank === 1
          ? `Your best ${one} yet`
          : `#${rank} of your last ${HISTORY_LENGTH} ${unit}`,
    };
  }, [period, stats, myStreak, myPoints]);

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
        <h2 className="font-bold text-sm">Progress</h2>
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
                <p className="text-sm font-bold">Track Progress</p>
                <p className="text-xs text-muted">Rank each day, week and month against your own best</p>
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
                    <p className="text-xs text-muted">{yourTier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-black text-primary">{formatTime(myMinutes)}</p>
                    <p className="text-xs text-muted uppercase">Focus</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-secondary">{yourTotalPoints}</p>
                    <p className="text-xs text-muted uppercase">Pts</p>
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
                  className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all capitalize ${
                    period === p ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-muted hover:text-white/70'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Points Info */}
            <div className="bg-surface-dark rounded-xl border border-white/5 p-3">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">How Points Work</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
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
            {/* Leaderboard */}
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-0.5">
                Your last 6 {period === 'daily' ? 'days' : period === 'weekly' ? 'weeks' : 'months'}
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          user.me
                            ? 'bg-gradient-to-br from-teal-400 to-blue-500'
                            : 'bg-white/10'
                        }`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${user.me ? 'text-white' : 'text-white/80'}`}>
                            {user.name} {user.me && <span className="text-xs text-primary font-bold">(you)</span>}
                          </p>
                          <p className="text-xs text-muted">{formatTime(user.minutes)} focused</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-0.5">
                          <span className={`material-symbols-outlined text-xs ${user.streak > 0 ? 'text-secondary' : 'text-muted/30'}`}>
                            local_fire_department
                          </span>
                          <span className={`text-xs font-bold ${user.streak > 0 ? 'text-secondary' : 'text-muted/30'}`}>
                            {user.streak}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
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
            <h3 className="text-sm font-bold mb-1">Progress Tracking Off</h3>
            <p className="text-xs text-muted max-w-[220px] leading-relaxed">
              Turn this on to rank your focus time against your own recent history and see your best day, week and month.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 w-full max-w-[260px]">
              <div className="bg-surface-dark rounded-lg border border-white/5 p-2.5 text-center">
                <span className="material-symbols-outlined text-yellow-400 text-base">emoji_events</span>
                <p className="text-xs text-muted mt-1">Daily</p>
              </div>
              <div className="bg-surface-dark rounded-lg border border-white/5 p-2.5 text-center">
                <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
                <p className="text-xs text-muted mt-1">Weekly</p>
              </div>
              <div className="bg-surface-dark rounded-lg border border-white/5 p-2.5 text-center">
                <span className="material-symbols-outlined text-secondary text-base">star</span>
                <p className="text-xs text-muted mt-1">Monthly</p>
              </div>
            </div>
          </div>
        )}

        {/* Demo Notice */}
        <div className="bg-surface-dark/50 rounded-xl p-3.5 border border-white/5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-muted text-base mt-0.5">info</span>
            <div>
              <p className="text-xs font-semibold text-white/70 mb-0.5">How this works</p>
              <p className="text-xs text-muted leading-relaxed">
                Tempo has no server, so it cannot see other people. You are ranked against your own recent history &mdash; every number here is yours and real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
