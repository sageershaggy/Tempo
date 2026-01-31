import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { STORAGE_KEYS } from '../config/constants';
import { googleTasksService } from '../services/googleTasks';
import { microsoftToDoService } from '../services/microsoftToDo';
import { authService, UserProfile } from '../services/authService';

interface IntegrationCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  isConnected: boolean;
  userProfile?: { name: string; email: string; picture?: string } | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  isLoading?: boolean;
  isSyncing?: boolean;
  lastSync?: string | null;
  syncResult?: string | null;
  connectLabel?: string;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  title, icon, description, isConnected, userProfile, onConnect, onDisconnect,
  onSync, isLoading, isSyncing, lastSync, syncResult, connectLabel
}) => (
  <div className="bg-surface-dark rounded-xl border border-white/5 overflow-hidden">
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center border border-white/10 shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{title}</h3>
              {isConnected && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  Connected
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {/* Connected user profile */}
      {isConnected && userProfile && (
        <div className="mt-3 bg-white/5 rounded-lg p-2.5 flex items-center gap-2.5">
          {userProfile.picture ? (
            <img src={userProfile.picture} alt="" className="w-7 h-7 rounded-full border border-white/10" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">
                {userProfile.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">{userProfile.name}</p>
            <p className="text-[9px] text-muted truncate">{userProfile.email}</p>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="mt-3 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
          <p className="text-[10px] text-primary font-semibold">{syncResult}</p>
        </div>
      )}

      {/* Last Sync */}
      {isConnected && lastSync && (
        <p className="text-[9px] text-muted mt-2">Last synced: {lastSync}</p>
      )}
    </div>

    {/* Action Buttons */}
    <div className="border-t border-white/5 p-3 flex gap-2">
      {isConnected ? (
        <>
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>
                {isSyncing ? 'progress_activity' : 'sync'}
              </span>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
          <button
            onClick={onDisconnect}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          onClick={onConnect}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Signing in...
            </>
          ) : (
            <>
              {icon}
              <span>{connectLabel || `Sign in with ${title.split(' ')[0]}`}</span>
            </>
          )}
        </button>
      )}
    </div>
  </div>
);

export const IntegrationsScreen: React.FC<GlobalProps> = ({ setScreen, tasks, setTasks }) => {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [msConnected, setMsConnected] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [googleSyncResult, setGoogleSyncResult] = useState<string | null>(null);
  const [msSyncResult, setMsSyncResult] = useState<string | null>(null);
  const [googleLastSync, setGoogleLastSync] = useState<string | null>(null);
  const [msLastSync, setMsLastSync] = useState<string | null>(null);
  const [googleProfile, setGoogleProfile] = useState<{ name: string; email: string; picture?: string } | null>(null);
  const [msProfile, setMsProfile] = useState<{ name: string; email: string; picture?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check connection status
    setGoogleConnected(googleTasksService.isConnected());
    setMsConnected(microsoftToDoService.isConnected());

    // Load saved state
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INTEGRATIONS);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.google) setGoogleConnected(true);
        if (state.microsoft) setMsConnected(true);
      }
    } catch (e) {}

    // Load saved profiles
    try {
      const gProfile = localStorage.getItem('tempo_google_profile');
      if (gProfile) setGoogleProfile(JSON.parse(gProfile));
      const mProfile = localStorage.getItem('tempo_ms_profile');
      if (mProfile) setMsProfile(JSON.parse(mProfile));
    } catch (e) {}

    // Load last sync times
    const gSync = googleTasksService.getLastSyncTime();
    if (gSync) setGoogleLastSync(formatTimeAgo(gSync));
    const mSync = microsoftToDoService.getLastSyncTime();
    if (mSync) setMsLastSync(formatTimeAgo(mSync));
  }, []);

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const saveIntegrationState = (google: boolean, microsoft: boolean) => {
    localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify({ google, microsoft }));
  };

  // Google Connect - triggers Google SSO login flow then connects Tasks
  const handleGoogleConnect = async () => {
    setLoading('google');
    setError(null);

    try {
      // Step 1: Sign in with Google SSO (shows Google account picker)
      const authResult = await authService.signInWithGoogle();

      if (!authResult.success) {
        setError(authResult.error || 'Google sign-in failed');
        setLoading(null);
        return;
      }

      // Step 2: Save user profile for display
      const profile = authResult.profile;
      if (profile) {
        const profileData = { name: profile.name, email: profile.email, picture: profile.picture };
        setGoogleProfile(profileData);
        localStorage.setItem('tempo_google_profile', JSON.stringify(profileData));
        localStorage.setItem('tempo_user_profile', JSON.stringify({
          displayName: profile.name,
          email: profile.email,
          picture: profile.picture,
        }));
      }

      // Step 3: Authenticate Google Tasks API
      const tasksAuth = await googleTasksService.authenticate();
      if (tasksAuth) {
        setGoogleConnected(true);
        saveIntegrationState(true, msConnected);
      } else {
        setError('Connected to Google but failed to access Tasks. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    }

    setLoading(null);
  };

  const handleGoogleDisconnect = async () => {
    await googleTasksService.disconnect();
    setGoogleConnected(false);
    setGoogleProfile(null);
    setGoogleSyncResult(null);
    setGoogleLastSync(null);
    localStorage.removeItem('tempo_google_profile');
    saveIntegrationState(false, msConnected);
  };

  const handleGoogleSync = async () => {
    setSyncing('google');
    setGoogleSyncResult(null);
    try {
      const result = await googleTasksService.syncBidirectional(tasks);
      const existingTitles = new Set(tasks.map(t => t.title));
      const newTasks = result.pulled.filter(t => !existingTitles.has(t.title));
      if (newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
      }
      setGoogleSyncResult(
        `✓ Pushed ${result.pushed.created} new, ${result.pushed.updated} updated. Pulled ${newTasks.length} new tasks.`
      );
      setGoogleLastSync('Just now');
    } catch (e: any) {
      setGoogleSyncResult(`✗ Sync failed: ${e.message}`);
    }
    setSyncing(null);
  };

  // Microsoft Connect - triggers Microsoft SSO login flow
  const handleMsConnect = async () => {
    setLoading('microsoft');
    setError(null);

    try {
      const success = await microsoftToDoService.authenticate();
      if (success) {
        setMsConnected(true);
        // Try to get profile from token (for dev mode, use mock)
        const profileData = { name: 'Microsoft User', email: 'user@outlook.com' };
        setMsProfile(profileData);
        localStorage.setItem('tempo_ms_profile', JSON.stringify(profileData));
        saveIntegrationState(googleConnected, true);
      } else {
        setError('Microsoft sign-in failed. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    }

    setLoading(null);
  };

  const handleMsDisconnect = async () => {
    await microsoftToDoService.disconnect();
    setMsConnected(false);
    setMsProfile(null);
    setMsSyncResult(null);
    setMsLastSync(null);
    localStorage.removeItem('tempo_ms_profile');
    saveIntegrationState(googleConnected, false);
  };

  const handleMsSync = async () => {
    setSyncing('microsoft');
    setMsSyncResult(null);
    try {
      const lists = await microsoftToDoService.getTaskLists();
      const listId = lists[0]?.id;
      if (!listId) throw new Error('No task lists found');

      const result = await microsoftToDoService.syncBidirectional(tasks, listId);
      const existingTitles = new Set(tasks.map(t => t.title));
      const newTasks = result.pulled.filter(t => !existingTitles.has(t.title));
      if (newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
      }
      setMsSyncResult(
        `✓ Pushed ${result.pushed.created} new, ${result.pushed.updated} updated. Pulled ${newTasks.length} new tasks.`
      );
      setMsLastSync('Just now');
    } catch (e: any) {
      setMsSyncResult(`✗ Sync failed: ${e.message}`);
    }
    setSyncing(null);
  };

  return (
    <div className="h-full flex flex-col bg-background-dark animate-fade-in font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-md z-20 px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => setScreen(Screen.SETTINGS)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <h2 className="font-bold text-sm">Integrations</h2>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar pb-24">
        {/* Info Banner */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3.5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-400 text-base mt-0.5">sync</span>
            <div>
              <h3 className="font-bold text-xs text-blue-200">Bidirectional Sync</h3>
              <p className="text-[10px] text-blue-200/60 leading-relaxed mt-0.5">
                Sign in with your Google or Microsoft account to sync tasks both ways.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400 text-sm">error</span>
            <p className="text-[11px] text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Google Tasks */}
        <IntegrationCard
          title="Google Tasks"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          }
          description="Sign in with Google to sync your tasks bidirectionally."
          isConnected={googleConnected}
          userProfile={googleProfile}
          isLoading={loading === 'google'}
          isSyncing={syncing === 'google'}
          onConnect={handleGoogleConnect}
          onDisconnect={handleGoogleDisconnect}
          onSync={handleGoogleSync}
          lastSync={googleLastSync}
          syncResult={googleSyncResult}
          connectLabel="Sign in with Google"
        />

        {/* Microsoft To Do */}
        <IntegrationCard
          title="Microsoft To Do"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
          }
          description="Sign in with Microsoft to sync with To Do and Outlook."
          isConnected={msConnected}
          userProfile={msProfile}
          isLoading={loading === 'microsoft'}
          isSyncing={syncing === 'microsoft'}
          onConnect={handleMsConnect}
          onDisconnect={handleMsDisconnect}
          onSync={handleMsSync}
          lastSync={msLastSync}
          syncResult={msSyncResult}
          connectLabel="Sign in with Microsoft"
        />

        {/* Setup Info */}
        <div className="bg-surface-dark/50 rounded-xl p-3.5 border border-white/5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-muted text-base mt-0.5">info</span>
            <div>
              <p className="text-[10px] text-muted leading-relaxed">
                Clicking "Sign in" will open a secure login window from Google or Microsoft.
                Your credentials are handled directly by their servers — Tempo never sees your password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
