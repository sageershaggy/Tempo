import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { getStats, exportUserData, exportUserDataAsCSV, UserStats } from '../services/storageService';

interface UserProfile {
  displayName: string;
  email: string;
  avatarUrl: string;
}

export const ProfileScreen: React.FC<GlobalProps> = ({ setScreen }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    displayName: 'Tempo User',
    email: '',
    avatarUrl: ''
  });
  const [editForm, setEditForm] = useState<UserProfile>(profile);

  // Load data on mount and set up refresh interval
  useEffect(() => {
    const loadData = async () => {
      const statsData = await getStats();
      setStats(statsData);

      // Load profile from localStorage
      const savedProfile = localStorage.getItem('tempo_userProfile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setProfile(parsed);
          setEditForm(parsed);
        } catch (e) {
          console.error('Failed to parse profile:', e);
        }
      }
    };
    loadData();

    // Refresh stats periodically to catch updates from timer sessions
    const refreshInterval = setInterval(() => {
      getStats().then(statsData => setStats(statsData));
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, []);

  const handleSaveProfile = () => {
    setProfile(editForm);
    localStorage.setItem('tempo_userProfile', JSON.stringify(editForm));
    setIsEditing(false);
  };

  const handleExportData = async () => {
    try {
      const data = await exportUserDataAsCSV();
      // Add BOM for Excel to recognize UTF-8
      const blob = new Blob(['\uFEFF' + data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Fix: Use local date for filename
      a.download = `tempo-data-${new Date().toLocaleDateString('en-CA')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'TU';
  };

  const totalHours = Math.floor((stats?.totalFocusMinutes || 0) / 60);

  const storageUsed = ((stats?.totalSessions || 0) * 0.1).toFixed(1);
  const storagePercent = Math.min((stats?.totalSessions || 0) * 0.5, 100);

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-md z-20 px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TIMER)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <h2 className="font-bold text-sm">Profile</h2>
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Profile Card */}
        <div className="bg-surface-dark rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 p-[2px]">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} className="w-full h-full rounded-full object-cover border-2 border-background-dark" alt="Profile" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-400 to-blue-500 border-2 border-background-dark flex items-center justify-center text-base font-bold">
                    {getInitials(profile.displayName)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold truncate">{profile.displayName}</h3>
              <p className="text-xs text-muted truncate">{profile.email || 'No email set'}</p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
            <p className="text-xl font-black text-primary leading-none mb-1">{stats?.totalSessions || 0}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider font-semibold">Sessions</p>
          </div>
          <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
            <p className="text-xl font-black text-secondary leading-none mb-1">{totalHours}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider font-semibold">Hours</p>
          </div>
          <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
            <p className="text-xl font-black text-amber-400 leading-none mb-1">{stats?.currentStreak || 0}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider font-semibold">Streak</p>
          </div>
        </div>

        {/* Data & Sync */}
        <div>
          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 ml-0.5">Data & Sync</h4>
          <div className="bg-surface-dark rounded-xl border border-white/5 divide-y divide-white/5">
            {/* Chrome Sync */}
            <div
              className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setSyncEnabled(!syncEnabled)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-muted">sync</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Chrome Sync</p>
                  <p className="text-[10px] text-muted flex items-center gap-1">
                    <span className={`w-1 h-1 rounded-full ${syncEnabled ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                    {syncEnabled ? 'Active' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${syncEnabled ? 'bg-primary' : 'bg-surface-light'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${syncEnabled ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Storage */}
            <div className="p-3.5">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px] text-muted">storage</span>
                  </div>
                  <p className="text-sm font-semibold">Local Storage</p>
                </div>
                <span className="text-[10px] font-bold text-muted">{storageUsed} KB</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden ml-11">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(storagePercent, 2)}%` }}></div>
              </div>
            </div>

            {/* Export */}
            <button
              onClick={handleExportData}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] text-muted">download</span>
              </div>
              <p className="text-sm font-semibold">Export Data</p>
              <span className="material-symbols-outlined text-muted text-sm ml-auto">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 ml-0.5">More</h4>
          <div className="bg-surface-dark rounded-xl border border-white/5 divide-y divide-white/5">
            <button
              onClick={() => setScreen(Screen.SETTINGS)}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] text-muted">tune</span>
              </div>
              <p className="text-sm font-semibold">Settings</p>
              <span className="material-symbols-outlined text-muted text-sm ml-auto">chevron_right</span>
            </button>
            <button
              onClick={() => setScreen(Screen.ADMIN)}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] text-muted">admin_panel_settings</span>
              </div>
              <p className="text-sm font-semibold">Admin</p>
              <span className="material-symbols-outlined text-muted text-sm ml-auto">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-dark rounded-t-2xl border-t border-white/10 p-5 pb-8 shadow-2xl animate-slide-up">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5"></div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">Edit Profile</h3>
              <button
                onClick={() => { setEditForm(profile); setIsEditing(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 p-[2px]">
                  {editForm.avatarUrl ? (
                    <img src={editForm.avatarUrl} className="w-full h-full rounded-full object-cover border-2 border-surface-dark" alt="Preview" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-400 to-blue-500 border-2 border-surface-dark flex items-center justify-center text-lg font-bold">
                      {getInitials(editForm.displayName)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted mb-1 block tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted mb-1 block tracking-wider">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted mb-1 block tracking-wider">Avatar URL</label>
                <input
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => { setEditForm(profile); setIsEditing(false); }}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm text-muted font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-light transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
