import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { STORAGE_KEYS } from '../config/constants';
import { googleTasksService } from '../services/googleTasks';
import { microsoftToDoService } from '../services/microsoftToDo';

interface IntegrationCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  isLoading?: boolean;
  isSyncing?: boolean;
  lastSync?: string | null;
  syncResult?: string | null;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  title, icon, description, isConnected, onConnect, onDisconnect,
  onSync, isLoading, isSyncing, lastSync, syncResult
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
          className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-light transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm">link</span>
          )}
          {isLoading ? 'Connecting...' : 'Connect'}
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

  useEffect(() => {
    // Check actual connection status from services
    setGoogleConnected(googleTasksService.isConnected());
    setMsConnected(microsoftToDoService.isConnected());

    // Also check saved integration state
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INTEGRATIONS);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.google && !googleTasksService.isConnected()) setGoogleConnected(state.google);
        if (state.microsoft && !microsoftToDoService.isConnected()) setMsConnected(state.microsoft);
      }
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

  const handleGoogleConnect = async () => {
    setLoading('google');
    const success = await googleTasksService.authenticate();
    if (success) {
      setGoogleConnected(true);
      saveIntegrationState(true, msConnected);
    }
    setLoading(null);
  };

  const handleGoogleDisconnect = async () => {
    await googleTasksService.disconnect();
    setGoogleConnected(false);
    setGoogleSyncResult(null);
    setGoogleLastSync(null);
    saveIntegrationState(false, msConnected);
  };

  const handleGoogleSync = async () => {
    setSyncing('google');
    setGoogleSyncResult(null);
    try {
      const result = await googleTasksService.syncBidirectional(tasks);

      // Merge pulled tasks (avoid duplicates by title)
      const existingTitles = new Set(tasks.map(t => t.title));
      const newTasks = result.pulled.filter(t => !existingTitles.has(t.title));
      if (newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
      }

      setGoogleSyncResult(
        `Pushed ${result.pushed.created} new, ${result.pushed.updated} updated. Pulled ${newTasks.length} new tasks.`
      );
      setGoogleLastSync('Just now');
    } catch (e: any) {
      setGoogleSyncResult(`Sync failed: ${e.message}`);
    }
    setSyncing(null);
  };

  const handleMsConnect = async () => {
    setLoading('microsoft');
    const success = await microsoftToDoService.authenticate();
    if (success) {
      setMsConnected(true);
      saveIntegrationState(googleConnected, true);
    }
    setLoading(null);
  };

  const handleMsDisconnect = async () => {
    await microsoftToDoService.disconnect();
    setMsConnected(false);
    setMsSyncResult(null);
    setMsLastSync(null);
    saveIntegrationState(googleConnected, false);
  };

  const handleMsSync = async () => {
    setSyncing('microsoft');
    setMsSyncResult(null);
    try {
      // Get available lists first, use the first one
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
        `Pushed ${result.pushed.created} new, ${result.pushed.updated} updated. Pulled ${newTasks.length} new tasks.`
      );
      setMsLastSync('Just now');
    } catch (e: any) {
      setMsSyncResult(`Sync failed: ${e.message}`);
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
                Tasks sync both ways. Create in Tempo or your external app - they stay in sync automatically.
              </p>
            </div>
          </div>
        </div>

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
          description="Sync tasks with Google Tasks. Requires Google account."
          isConnected={googleConnected}
          isLoading={loading === 'google'}
          isSyncing={syncing === 'google'}
          onConnect={handleGoogleConnect}
          onDisconnect={handleGoogleDisconnect}
          onSync={handleGoogleSync}
          lastSync={googleLastSync}
          syncResult={googleSyncResult}
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
          description="Sync tasks with Microsoft To Do and Outlook Tasks."
          isConnected={msConnected}
          isLoading={loading === 'microsoft'}
          isSyncing={syncing === 'microsoft'}
          onConnect={handleMsConnect}
          onDisconnect={handleMsDisconnect}
          onSync={handleMsSync}
          lastSync={msLastSync}
          syncResult={msSyncResult}
        />

        {/* Sync Info */}
        <div className="bg-surface-dark/50 rounded-xl p-3.5 border border-white/5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-muted text-base mt-0.5">info</span>
            <div>
              <p className="text-xs font-semibold text-white/70 mb-0.5">Setup Guide</p>
              <p className="text-[10px] text-muted leading-relaxed">
                To use Google Tasks sync, ensure your extension has a valid OAuth2 client ID configured in the manifest.
                For Microsoft To Do, register an Azure AD app with Tasks.ReadWrite scope.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
