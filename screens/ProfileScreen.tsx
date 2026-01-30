import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { getStats, exportUserData, UserStats } from '../services/storageService';

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

  useEffect(() => {
    const loadData = async () => {
      const statsData = await getStats();
      setStats(statsData);

      // Load profile from localStorage
      const savedProfile = localStorage.getItem('tempo_userProfile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        setEditForm(parsed);
      }
    };
    loadData();
  }, []);

  const handleSaveProfile = () => {
    setProfile(editForm);
    localStorage.setItem('tempo_userProfile', JSON.stringify(editForm));
    setIsEditing(false);
  };

  const handleExportData = async () => {
    try {
      const data = await exportUserData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tempo-data-${new Date().toISOString().split('T')[0]}.json`;
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

  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.TIMER)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="font-bold text-lg">Profile & Sync</h2>
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>

      <div className="p-6">
        {/* Profile Card */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary p-1">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} className="w-full h-full rounded-full object-cover border-4 border-background-dark" alt="Profile" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-400 to-blue-500 border-4 border-background-dark flex items-center justify-center text-xl font-bold">
                  {getInitials(profile.displayName)}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-background-dark hover:bg-primary-light transition-colors"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">{profile.displayName}</h3>
            <p className="text-sm text-muted mb-2">{profile.email || 'No email set'}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
            <p className="text-2xl font-black text-primary">{stats?.totalSessions || 0}</p>
            <p className="text-[10px] text-muted uppercase">Sessions</p>
          </div>
          <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
            <p className="text-2xl font-black text-secondary">{totalHours}</p>
            <p className="text-[10px] text-muted uppercase">Hours</p>
          </div>
          <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
            <p className="text-2xl font-black text-amber-400">{stats?.currentStreak || 0}</p>
            <p className="text-[10px] text-muted uppercase">Day Streak</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Sync & Storage */}
          <div>
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Sync & Storage</h4>
            <div className="bg-surface-dark rounded-2xl p-5 border border-white/5">
              <div
                className="flex items-center justify-between mb-5 cursor-pointer"
                onClick={() => setSyncEnabled(!syncEnabled)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#202124] flex items-center justify-center border border-white/10 shadow-inner">
                    <span className="material-symbols-outlined text-white">sync</span>
                  </div>
                  <div>
                    <div className="font-semibold">Sync with Chrome</div>
                    <div className="text-xs text-muted flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${syncEnabled ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                      {syncEnabled ? 'Last synced: Just now' : 'Sync disabled'}
                    </div>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full relative cursor-pointer shadow-inner transition-colors ${syncEnabled ? 'bg-primary' : 'bg-surface-light'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${syncEnabled ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="material-symbols-outlined text-muted">cloud</span> Local Storage
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {((stats?.totalSessions || 0) * 0.1).toFixed(1)} KB used
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${Math.min((stats?.totalSessions || 0) * 0.5, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1">Support</h4>
            <div className="bg-gradient-to-br from-surface-dark to-primary/10 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>
              <div className="relative z-10">
                <h5 className="font-bold mb-1">Developer Feedback</h5>
                <p className="text-xs text-muted mb-4">Have an idea? We read every message.</p>
                <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-base">chat_bubble</span> Send Feedback
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full py-4 rounded-xl border border-primary/30 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">download</span> Export Data as JSON
            </button>
            <button onClick={() => setScreen(Screen.ADMIN)} className="w-full py-2 text-xs text-muted/30 hover:text-white uppercase font-bold tracking-widest">
              Site Admin
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-dark rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Edit Profile</h3>
              <button
                onClick={() => {
                  setEditForm(profile);
                  setIsEditing(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-muted">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Avatar Preview */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary p-1">
                  {editForm.avatarUrl ? (
                    <img src={editForm.avatarUrl} className="w-full h-full rounded-full object-cover border-4 border-surface-dark" alt="Preview" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-400 to-blue-500 border-4 border-surface-dark flex items-center justify-center text-xl font-bold">
                      {getInitials(editForm.displayName)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted mb-1 block">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted mb-1 block">Avatar URL (optional)</label>
                <input
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-[10px] text-muted mt-1">Leave empty to use initials</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setEditForm(profile);
                    setIsEditing(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-muted font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-light transition-colors"
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
