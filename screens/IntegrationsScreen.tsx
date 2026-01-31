import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { STORAGE_KEYS } from '../config/constants';

interface IntegrationCardProps {
    title: string;
    icon: string; // Material symbol name or SVG
    description: string;
    isConnected: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    isLoading?: boolean;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
    title,
    icon,
    description,
    isConnected,
    onConnect,
    onDisconnect,
    isLoading
}) => (
    <div className="bg-surface-light p-4 rounded-xl border border-white/5 flex flex-col gap-3">
        <div className="flex justify-between items-start">
            <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center border border-white/10">
                    {icon.startsWith('http') || icon.startsWith('<svg') ? (
                        <span dangerouslySetInnerHTML={{ __html: icon }} />
                    ) : (
                        <span className="material-symbols-outlined text-primary">{icon}</span>
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-sm">{title}</h3>
                    <p className="text-xs text-muted">{description}</p>
                </div>
            </div>
            {isConnected && <span className="text-green-400 material-symbols-outlined text-sm">check_circle</span>}
        </div>

        <button
            onClick={isConnected ? onDisconnect : onConnect}
            disabled={isLoading}
            className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${isConnected
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                    : 'bg-primary text-white hover:bg-primary-light'
                }`}
        >
            {isLoading ? 'Processing...' : isConnected ? 'Disconnect' : 'Connect'}
        </button>
    </div>
);

export const IntegrationsScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
    const [googleConnected, setGoogleConnected] = useState(false);
    const [msConnected, setMsConnected] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    // Load saved integration state on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.INTEGRATIONS);
            if (saved) {
                const state = JSON.parse(saved);
                setGoogleConnected(state.google || false);
                setMsConnected(state.microsoft || false);
            }
        } catch (e) {
            // Ignore parse errors
        }
    }, []);

    const saveIntegrationState = (google: boolean, microsoft: boolean) => {
        localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify({ google, microsoft }));
    };

    const handleConnect = async (provider: 'google' | 'microsoft') => {
        setLoading(provider);
        // TODO: Replace with actual OAuth flow (chrome.identity.launchWebAuthFlow)
        // For now, simulate a connection delay
        setTimeout(() => {
            if (provider === 'google') {
                setGoogleConnected(true);
                saveIntegrationState(true, msConnected);
            }
            if (provider === 'microsoft') {
                setMsConnected(true);
                saveIntegrationState(googleConnected, true);
            }
            setLoading(null);
        }, 1500);
    };

    const handleDisconnect = (provider: 'google' | 'microsoft') => {
        if (provider === 'google') {
            setGoogleConnected(false);
            saveIntegrationState(false, msConnected);
        }
        if (provider === 'microsoft') {
            setMsConnected(false);
            saveIntegrationState(googleConnected, false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background-dark animate-fade-in font-sans">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-surface-dark/50 backdrop-blur-md sticky top-0 z-20">
                <button
                    onClick={() => setScreen(Screen.SETTINGS)}
                    className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold">Integrations</h1>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <div className="flex gap-3 mb-2">
                        <span className="material-symbols-outlined text-blue-400">sync</span>
                        <h3 className="font-bold text-sm text-blue-100">Bi-directional Sync</h3>
                    </div>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                        Connect your accounts to automatically sync tasks. Tasks created in Tempo will appear in your external apps, and vice versa.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Available Connections</h2>

                    <IntegrationCard
                        title="Google Tasks"
                        icon="task"
                        description="Sync with your Google Tasks lists."
                        isConnected={googleConnected}
                        isLoading={loading === 'google'}
                        onConnect={() => handleConnect('google')}
                        onDisconnect={() => handleDisconnect('google')}
                    />

                    <IntegrationCard
                        title="Microsoft To Do"
                        icon="check_box"
                        description="Sync with Microsoft To Do and Outlook."
                        isConnected={msConnected}
                        isLoading={loading === 'microsoft'}
                        onConnect={() => handleConnect('microsoft')}
                        onDisconnect={() => handleDisconnect('microsoft')}
                    />
                </div>
            </div>
        </div>
    );
};
