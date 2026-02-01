import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { generateLicenseKey, getAdminConfig, saveAdminConfig, AdminConfig } from '../services/storageService';
import { configManager } from '../config';
import { STORAGE_KEYS } from '../config/constants';

interface GeneratedLicense {
  key: string;
  plan: 'monthly' | 'yearly';
  createdAt: string;
  assignedTo?: string;
}

interface MockUser {
  id: string;
  email: string;
  isPro: boolean;
  plan: 'monthly' | 'yearly' | null;
  joinedAt: string;
  lastActive: string;
  licenseKey?: string;
}

// Load users from localStorage or return empty array (users should come from backend in production)
const loadMockUsers = (): MockUser[] => {
  try {
    const saved = localStorage.getItem('tempo_admin_users');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load users:', e);
  }
  return [];
};

const saveMockUsers = (users: MockUser[]): void => {
  localStorage.setItem('tempo_admin_users', JSON.stringify(users));
};

type AdminTab = 'overview' | 'users' | 'feedback' | 'licenses' | 'payments' | 'access' | 'settings';

export const AdminScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [config, setConfig] = useState<AdminConfig>({
    stripeMonthlyLink: '',
    stripeYearlyLink: '',
    maintenanceMode: false,
    freeTrialEnabled: true,
    freeTrialDays: 7,
    globalAccessEnabled: false,
    globalAccessEndDate: null
  });

  const [users, setUsers] = useState<MockUser[]>(loadMockUsers());
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'pro' | 'free'>('all');
  const [generatedLicenses, setGeneratedLicenses] = useState<GeneratedLicense[]>([]);
  const [licenseEmail, setLicenseEmail] = useState('');
  const [licensePlan, setLicensePlan] = useState<'monthly' | 'yearly'>('yearly');

  // Load admin password from config
  const appConfig = configManager.getConfig();
  const ADMIN_PASSWORD = appConfig.admin.passwordHash;
  const PRICING = appConfig.pricing;

  useEffect(() => {
    getAdminConfig().then(setConfig);
  }, []);

  // Save users when they change
  useEffect(() => {
    saveMockUsers(users);
  }, [users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Note: In production, use proper authentication with hashed passwords
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH_TOKEN, 'authenticated');
    } else {
      alert('Invalid Admin Key');
    }
  };

  const handleSaveConfig = async () => {
    await saveAdminConfig(config);
    alert('Configuration saved!');
  };

  const handleGenerateLicense = () => {
    const key = generateLicenseKey(licensePlan);
    const newLicense: GeneratedLicense = {
      key,
      plan: licensePlan,
      createdAt: new Date().toISOString(),
      assignedTo: licenseEmail || undefined
    };
    setGeneratedLicenses([newLicense, ...generatedLicenses]);
    setLicenseEmail('');
  };

  const handleToggleUserPro = (userId: string) => {
    setUsers(users.map(u => {
      if (u.id !== userId) return u;
      if (u.isPro) {
        return { ...u, isPro: false, plan: null, licenseKey: undefined };
      } else {
        const key = generateLicenseKey('yearly');
        return { ...u, isPro: true, plan: 'yearly', licenseKey: key };
      }
    }));
  };

  const copyToClipboard = (text: string) => {
    try { navigator.clipboard.writeText(text); } catch (e) { /* clipboard not available */ }
  };

  const filteredUsers = users.filter(u => {
    if (userSearch && !u.email.toLowerCase().includes(userSearch.toLowerCase())) return false;
    if (userFilter === 'pro' && !u.isPro) return false;
    if (userFilter === 'free' && u.isPro) return false;
    return true;
  });

  const stats = {
    totalUsers: users.length,
    proUsers: users.filter(u => u.isPro).length,
    monthlyRevenue: users.filter(u => u.plan === 'monthly').length * 1 + users.filter(u => u.plan === 'yearly').length * (10 / 12),
    yearlyRevenue: users.filter(u => u.plan === 'yearly').length * 10 + users.filter(u => u.plan === 'monthly').length * 12
  };

  const isGlobalAccessActive = config.globalAccessEnabled && config.globalAccessEndDate && new Date(config.globalAccessEndDate) > new Date();

  if (!isLoggedIn) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background-dark px-6">
        <div className="w-16 h-16 bg-surface-light rounded-2xl flex items-center justify-center mb-4 border border-white/10">
          <span className="material-symbols-outlined text-3xl text-primary">admin_panel_settings</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Site Administration</h2>
        <p className="text-sm text-muted mb-6">Enter admin credentials to continue</p>
        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter Admin Key"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:border-primary outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">
            Login
          </button>
        </form>
        <button onClick={() => setScreen(Screen.PROFILE)} className="mt-6 text-xs text-muted hover:text-white transition-colors">
          Return to App
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-dark overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-surface-dark shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">admin_panel_settings</span>
          <h2 className="font-bold text-sm">Tempo Admin</h2>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="text-xs text-red-400 font-bold hover:text-red-300 mr-10">
          Logout
        </button>
      </div>

      {/* Tabs - Scrollable */}
      <div className="flex border-b border-white/10 bg-surface-dark/50 overflow-x-auto no-scrollbar shrink-0 px-1">
        {[
          { id: 'overview', label: 'Home', icon: 'dashboard' },
          { id: 'users', label: 'Users', icon: 'group' },
          { id: 'feedback', label: 'Reports', icon: 'bug_report' },
          { id: 'licenses', label: 'Keys', icon: 'key' },
          { id: 'payments', label: 'Pay', icon: 'payments' },
          { id: 'access', label: 'Access', icon: 'lock_open' },
          { id: 'settings', label: 'Config', icon: 'settings' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`flex items-center gap-1 px-2.5 py-2.5 text-[10px] font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
              ? 'text-primary border-primary'
              : 'text-muted border-transparent hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined text-xs">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
        {/* ... content ... */}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {isGlobalAccessActive && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-400 text-lg">verified</span>
                  <div>
                    <p className="text-sm font-bold text-green-400">Global Pro Access Active</p>
                    <p className="text-[10px] text-green-400/70">Until {new Date(config.globalAccessEndDate!).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-dark p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-muted uppercase font-bold mb-0.5">Total Users</p>
                <p className="text-xl font-bold text-white">{stats.totalUsers}</p>
              </div>
              <div className="bg-surface-dark p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-muted uppercase font-bold mb-0.5">Pro Users</p>
                <p className="text-xl font-bold text-primary">{stats.proUsers}</p>
              </div>
              <div className="bg-surface-dark p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-muted uppercase font-bold mb-0.5">MRR</p>
                <p className="text-xl font-bold text-green-400">${stats.monthlyRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-surface-dark p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-muted uppercase font-bold mb-0.5">ARR</p>
                <p className="text-xl font-bold text-green-400">${stats.yearlyRevenue.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-surface-dark rounded-xl p-3 border border-white/5">
              <h3 className="font-bold mb-2 text-xs">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('licenses')}
                  className="p-2.5 bg-primary/10 border border-primary/30 rounded-lg text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                >
                  Generate License
                </button>
                <button
                  onClick={() => setActiveTab('access')}
                  className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[10px] font-bold hover:bg-green-500/20 transition-colors"
                >
                  Global Access
                </button>
              </div>
            </div>

            <div className="bg-surface-dark rounded-xl border border-white/5">
              <h3 className="font-bold p-3 border-b border-white/5 text-xs">Recent Pro Activations</h3>
              {users.filter(u => u.isPro).slice(0, 3).map(user => (
                <div key={user.id} className="p-2.5 border-b border-white/5 last:border-0 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium">{user.email}</p>
                    <p className="text-[9px] text-muted capitalize">{user.plan} Plan</p>
                  </div>
                  <span className="text-green-400 text-[10px] font-bold">Active</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Feedback/Reports Tab */}
        {activeTab === 'feedback' && (
          <>
            <div className="bg-surface-dark rounded-xl border border-white/5 overflow-hidden">
              <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <p className="text-[10px] text-muted uppercase font-bold">User Reports</p>
                <button
                  onClick={() => {
                    if (confirm('Clear all reports?')) {
                      localStorage.removeItem('tempo_feedback_reports');
                      setActiveTab('overview'); // Refresh workaround
                      setTimeout(() => setActiveTab('feedback'), 50);
                    }
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              </div>
              {(() => {
                let reports: any[] = [];
                try { reports = JSON.parse(localStorage.getItem('tempo_feedback_reports') || '[]'); } catch (e) { reports = []; }
                if (reports.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <span className="material-symbols-outlined text-4xl text-white/10 mb-2">inbox</span>
                      <p className="text-xs text-muted">No reports found.</p>
                    </div>
                  );
                }
                return reports.map((report: any, i: number) => (
                  <div key={i} className="p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-sm ${report.type === 'bug' ? 'text-red-400' : 'text-blue-400'}`}>
                          {report.type === 'bug' ? 'bug_report' : 'chat_bubble'}
                        </span>
                        <span className="text-xs font-bold capitalize">{report.type}</span>
                      </div>
                      <span className="text-[9px] text-muted">{new Date(report.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-white/80 mb-2 whitespace-pre-wrap">{report.text}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-muted">{report.user}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${report.status === 'open' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:border-primary outline-none"
                />
              </div>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value as any)}
                className="bg-surface-dark border border-white/10 rounded-lg px-2 text-xs text-white focus:border-primary outline-none"
              >
                <option value="all">All</option>
                <option value="pro">Pro</option>
                <option value="free">Free</option>
              </select>
            </div>

            <div className="bg-surface-dark rounded-xl border border-white/5 overflow-hidden">
              <div className="p-2.5 border-b border-white/5 bg-black/20">
                <p className="text-[9px] text-muted uppercase font-bold">{filteredUsers.length} Users</p>
              </div>
              {filteredUsers.map(user => (
                <div key={user.id} className="p-3 border-b border-white/5 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-xs">{user.email}</p>
                      <p className="text-[9px] text-muted">Joined: {user.joinedAt}</p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${user.isPro ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted'}`}>
                      {user.isPro ? `PRO` : 'FREE'}
                    </span>
                  </div>
                  {user.licenseKey && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <code className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">{user.licenseKey}</code>
                      <button onClick={() => copyToClipboard(user.licenseKey!)} className="text-muted hover:text-white">
                        <span className="material-symbols-outlined text-xs">content_copy</span>
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleToggleUserPro(user.id)}
                    className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-colors ${user.isPro
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                      }`}
                  >
                    {user.isPro ? 'Revoke Pro' : 'Grant Pro'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Licenses Tab */}
        {activeTab === 'licenses' && (
          <>
            <div className="bg-surface-dark rounded-xl p-3 border border-white/5">
              <h3 className="font-bold mb-3 flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-primary text-sm">add_circle</span>
                Generate New License
              </h3>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[9px] text-muted uppercase font-bold mb-1 block">Assign to Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={licenseEmail}
                    onChange={(e) => setLicenseEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted uppercase font-bold mb-1 block">Plan Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLicensePlan('monthly')}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-colors ${licensePlan === 'monthly' ? 'bg-white text-black border-white' : 'border-white/10 text-muted hover:border-white/30'
                        }`}
                    >
                      Monthly ($1)
                    </button>
                    <button
                      onClick={() => setLicensePlan('yearly')}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-colors ${licensePlan === 'yearly' ? 'bg-primary text-white border-primary' : 'border-white/10 text-muted hover:border-white/30'
                        }`}
                    >
                      Yearly ($10)
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleGenerateLicense}
                  className="w-full py-2.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary-light transition-colors"
                >
                  Generate License Key
                </button>
              </div>
            </div>

            {generatedLicenses.length > 0 && (
              <div className="bg-surface-dark rounded-xl border border-white/5">
                <h3 className="font-bold p-3 border-b border-white/5 text-xs">Generated Licenses</h3>
                {generatedLicenses.map((license, i) => (
                  <div key={i} className="p-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <code className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded font-mono">{license.key}</code>
                      <button
                        onClick={() => copyToClipboard(license.key)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-xs text-muted">content_copy</span>
                      </button>
                    </div>
                    <div className="flex justify-between text-[9px] text-muted">
                      <span className="capitalize">{license.plan} Plan</span>
                      <span>{license.assignedTo || 'Unassigned'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <>
            <div className="bg-surface-dark rounded-xl p-3 border border-white/5">
              <h3 className="font-bold mb-3 flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-yellow-400 text-sm">link</span>
                Stripe Payment Links
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-muted uppercase font-bold mb-1 block">Monthly Plan ($1/mo)</label>
                  <input
                    type="url"
                    placeholder="https://buy.stripe.com/..."
                    value={config.stripeMonthlyLink}
                    onChange={(e) => setConfig({ ...config, stripeMonthlyLink: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-2 text-[10px] text-blue-400 font-mono focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted uppercase font-bold mb-1 block">Yearly Plan ($10/yr)</label>
                  <input
                    type="url"
                    placeholder="https://buy.stripe.com/..."
                    value={config.stripeYearlyLink}
                    onChange={(e) => setConfig({ ...config, stripeYearlyLink: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-2.5 py-2 text-[10px] text-blue-400 font-mono focus:border-primary outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveConfig}
                  className="w-full py-2 bg-primary/20 text-primary font-bold rounded-lg text-[10px] hover:bg-primary/30 transition-colors"
                >
                  Save Payment Links
                </button>
              </div>
            </div>

            <div className="bg-surface-dark rounded-xl border border-white/5">
              <h3 className="font-bold p-3 border-b border-white/5 text-xs">Recent Transactions</h3>
              {[
                { email: 'user_1001@gmail.com', plan: 'Yearly', amount: '$10.00', date: 'Jan 22' },
                { email: 'user_1002@outlook.com', plan: 'Monthly', amount: '$1.00', date: 'Jan 21' },
              ].map((tx, i) => (
                <div key={i} className="p-2.5 border-b border-white/5 last:border-0 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium">{tx.email}</p>
                    <p className="text-[9px] text-muted">{tx.plan} • {tx.date}</p>
                  </div>
                  <span className="text-green-400 text-xs font-bold">{tx.amount}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Access Tab - Global Pro Access Control */}
        {activeTab === 'access' && (
          <>
            <div className="bg-gradient-to-br from-green-500/10 to-primary/10 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-green-400">public</span>
                <h3 className="font-bold text-sm text-green-400">Global Pro Access</h3>
              </div>
              <p className="text-xs text-muted mb-4">
                Enable full Pro access for ALL users until the specified date. Perfect for launches, promotions, or beta testing.
              </p>

              <div className="space-y-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setConfig({ ...config, globalAccessEnabled: !config.globalAccessEnabled })}
                >
                  <div>
                    <p className="text-sm font-bold">Enable Global Access</p>
                    <p className="text-[10px] text-muted">All users get Pro features</p>
                  </div>
                  <button
                    className={`w-12 h-7 rounded-full relative transition-colors ${config.globalAccessEnabled ? 'bg-green-500' : 'bg-surface-light'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.globalAccessEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                {config.globalAccessEnabled && (
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold mb-1 block">Access End Date</label>
                    <input
                      type="date"
                      value={config.globalAccessEndDate || ''}
                      onChange={(e) => setConfig({ ...config, globalAccessEndDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-green-500 outline-none"
                    />
                    {config.globalAccessEndDate && (
                      <p className="text-[10px] text-green-400 mt-1">
                        Pro until: {new Date(config.globalAccessEndDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-dark rounded-xl p-3 border border-white/5">
              <h3 className="font-bold mb-3 text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">hourglass_top</span>
                Free Trial Settings
              </h3>

              <div className="space-y-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setConfig({ ...config, freeTrialEnabled: !config.freeTrialEnabled })}
                >
                  <div>
                    <p className="text-sm font-medium">Enable Free Trial</p>
                    <p className="text-[10px] text-muted">New users get trial period</p>
                  </div>
                  <button
                    className={`w-11 h-6 rounded-full relative transition-colors ${config.freeTrialEnabled ? 'bg-primary' : 'bg-surface-light'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${config.freeTrialEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                  </button>
                </div>

                {config.freeTrialEnabled && (
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold mb-1 block">Trial Duration (Days)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={config.freeTrialDays}
                        onChange={(e) => setConfig({ ...config, freeTrialDays: Number(e.target.value) })}
                        className="flex-1 h-1.5 bg-surface-light rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer"
                      />
                      <span className="text-sm font-bold text-primary w-8">{config.freeTrialDays}d</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors"
            >
              Save Access Settings
            </button>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
            <div className="bg-surface-dark rounded-xl p-3 border border-white/5">
              <h3 className="font-bold mb-3 text-xs">System Settings</h3>
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                >
                  <div>
                    <p className="text-sm font-medium">Maintenance Mode</p>
                    <p className="text-[10px] text-muted">Disable app for all users</p>
                  </div>
                  <button
                    className={`w-11 h-6 rounded-full relative transition-colors ${config.maintenanceMode ? 'bg-red-500' : 'bg-surface-light'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${config.maintenanceMode ? 'right-0.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface-dark rounded-xl p-3 border border-white/5">
              <h3 className="font-bold mb-3 text-xs">Admin Credentials</h3>
              <p className="text-[10px] text-muted mb-2">Current password: admin123</p>
              <p className="text-[10px] text-yellow-400">Note: Change this in production!</p>
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors"
            >
              Save All Settings
            </button>

            <button
              onClick={() => setScreen(Screen.PROFILE)}
              className="w-full py-2.5 border border-white/10 rounded-xl text-xs font-medium hover:bg-white/5 transition-colors"
            >
              Return to App
            </button>
          </>
        )}
      </div>
    </div>
  );
};
