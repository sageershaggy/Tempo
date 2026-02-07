// Chrome Storage Service for Tempo Focus
declare var chrome: any;

import { configManager } from '../config';
import { TIME } from '../config/constants';

export interface UserSettings {
  focusDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomos: boolean;
  notifications: boolean;
  darkMode: boolean;
  theme: string;
  tickingEnabled: boolean;
  tickingSpeed: number;
}

export interface UserStats {
  totalSessions: number;
  totalFocusMinutes: number;
  currentStreak: number;
  lastSessionDate: string | null;
  weeklyData: Record<string, number>;
}

export interface ProStatus {
  isPro: boolean;
  proExpiry: number | null;
  licenseKey: string | null;
  activatedAt: number | null;
  plan: 'monthly' | 'yearly' | null;
}

export interface AdminConfig {
  stripeMonthlyLink: string;
  stripeYearlyLink: string;
  maintenanceMode: boolean;
  freeTrialEnabled: boolean;
  freeTrialDays: number;
  globalAccessEnabled: boolean;
  globalAccessEndDate: string | null;
}

// Check if running in Chrome Extension context
const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage;

// Fallback to localStorage for development
const localStorageFallback = {
  get: (keys: string | string[] | null): Promise<Record<string, any>> => {
    return new Promise((resolve) => {
      const result: Record<string, any> = {};
      const keyList = keys === null ? Object.keys(localStorage) :
        typeof keys === 'string' ? [keys] : keys;
      keyList.forEach(key => {
        const value = localStorage.getItem(`tempo_${key}`);
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      resolve(result);
    });
  },
  set: (items: Record<string, any>): Promise<void> => {
    return new Promise((resolve) => {
      Object.entries(items).forEach(([key, value]) => {
        localStorage.setItem(`tempo_${key}`, JSON.stringify(value));
      });
      resolve();
    });
  },
  remove: (keys: string | string[]): Promise<void> => {
    return new Promise((resolve) => {
      const keyList = typeof keys === 'string' ? [keys] : keys;
      keyList.forEach(key => localStorage.removeItem(`tempo_${key}`));
      resolve();
    });
  }
};

const storage = {
  sync: isChromeExtension ? {
    get: (keys: string | string[] | null) => new Promise<Record<string, any>>((resolve) => {
      chrome.storage.sync.get(keys, resolve);
    }),
    set: (items: Record<string, any>) => new Promise<void>((resolve) => {
      chrome.storage.sync.set(items, resolve);
    }),
    remove: (keys: string | string[]) => new Promise<void>((resolve) => {
      chrome.storage.sync.remove(keys, resolve);
    })
  } : localStorageFallback,
  local: isChromeExtension ? {
    get: (keys: string | string[] | null) => new Promise<Record<string, any>>((resolve) => {
      chrome.storage.local.get(keys, resolve);
    }),
    set: (items: Record<string, any>) => new Promise<void>((resolve) => {
      chrome.storage.local.set(items, resolve);
    }),
    remove: (keys: string | string[]) => new Promise<void>((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    })
  } : localStorageFallback
};

// Settings - Load defaults from config
export const getSettings = async (): Promise<UserSettings> => {
  const config = configManager.getConfig();
  const defaults: UserSettings = {
    focusDuration: config.defaults.settings.focusDuration,
    shortBreak: config.defaults.settings.shortBreak,
    longBreak: config.defaults.settings.longBreak,
    longBreakInterval: config.defaults.settings.longBreakInterval,
    autoStartBreaks: config.defaults.settings.autoStartBreaks,
    autoStartPomos: config.defaults.settings.autoStartPomos,
    notifications: config.defaults.settings.notifications,
    darkMode: config.defaults.settings.darkMode,
    theme: config.defaults.settings.theme,
    tickingEnabled: config.defaults.settings.tickingEnabled,
    tickingSpeed: config.defaults.settings.tickingSpeed
  };
  const data = await storage.sync.get('settings');
  return { ...defaults, ...(data.settings || {}) };
};

export const saveSettings = async (settings: Partial<UserSettings>): Promise<void> => {
  const current = await getSettings();
  await storage.sync.set({ settings: { ...current, ...settings } });
};

// Stats - Load defaults from config
export const getStats = async (): Promise<UserStats> => {
  const config = configManager.getConfig();
  const defaults: UserStats = {
    totalSessions: config.defaults.stats.totalSessions,
    totalFocusMinutes: config.defaults.stats.totalFocusMinutes,
    currentStreak: config.defaults.stats.currentStreak,
    lastSessionDate: null,
    weeklyData: {}
  };
  const data = await storage.local.get('stats');
  return { ...defaults, ...(data.stats || {}) };
};

export const updateStats = async (sessionMinutes: number): Promise<void> => {
  console.log('[Tempo] updateStats called with', sessionMinutes, 'minutes');
  const stats = await getStats();
  // Fix: Use local date string (YYYY-MM-DD) instead of UTC to avoidtimezone issues
  // This ensures sessions late at night count for the "user's today"
  const today = new Date().toLocaleDateString('en-CA'); 

  // Update streak
  if (stats.lastSessionDate) {
    const lastDate = new Date(stats.lastSessionDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    if (stats.lastSessionDate === yesterdayStr) {
      stats.currentStreak += 1;
    } else if (stats.lastSessionDate !== today) {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
  }

  stats.totalSessions += 1;
  stats.totalFocusMinutes += sessionMinutes;
  stats.lastSessionDate = today;

  // Ensure weeklyData exists
  if (!stats.weeklyData) {
    stats.weeklyData = {};
  }
  stats.weeklyData[today] = (stats.weeklyData[today] || 0) + sessionMinutes;

  console.log('[Tempo] Saving stats:', stats);

  // Save to storage and wait for completion
  await storage.local.set({ stats });

  // Also save to sync storage for cross-device access
  try {
    await storage.sync.set({ stats });
  } catch (e) {
    console.log('[Tempo] Sync storage save failed (not critical):', e);
  }

  console.log('[Tempo] Stats saved successfully');
};

// Pro Status
export const getProStatus = async (): Promise<ProStatus> => {
  const data = await storage.sync.get(['isPro', 'proExpiry', 'licenseKey', 'activatedAt', 'plan']);
  const now = Date.now();

  // Check if pro expired
  if (data.isPro && data.proExpiry && data.proExpiry < now) {
    await storage.sync.set({ isPro: false });
    return { isPro: false, proExpiry: null, licenseKey: null, activatedAt: null, plan: null };
  }

  return {
    isPro: data.isPro || false,
    proExpiry: data.proExpiry || null,
    licenseKey: data.licenseKey || null,
    activatedAt: data.activatedAt || null,
    plan: data.plan || null
  };
};

export const activatePro = async (licenseKey: string, plan: 'monthly' | 'yearly'): Promise<boolean> => {
  const expiry = plan === 'yearly'
    ? Date.now() + TIME.YEAR_365
    : Date.now() + TIME.MONTH_30;

  await storage.sync.set({
    isPro: true,
    proExpiry: expiry,
    licenseKey,
    activatedAt: Date.now(),
    plan
  });
  return true;
};

export const deactivatePro = async (): Promise<void> => {
  await storage.sync.set({
    isPro: false,
    proExpiry: null,
    licenseKey: null,
    activatedAt: null,
    plan: null
  });
};

// License Key Validation (simple client-side for demo)
export const validateLicenseKey = (key: string): { valid: boolean; plan?: 'monthly' | 'yearly' } => {
  const config = configManager.getConfig();

  // Check test keys from config
  if (config.pricing.testLicenseKeys.includes(key)) {
    return { valid: true, plan: 'yearly' };
  }

  // License format from config pattern
  const match = key.toUpperCase().match(config.pricing.licensePattern);

  if (!match) return { valid: false };

  const plan = match[1] === 'Y' ? 'yearly' : 'monthly';
  return { valid: true, plan };
};

// Generate License Key (for admin)
export const generateLicenseKey = (plan: 'monthly' | 'yearly'): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const suffix = plan === 'yearly' ? 'Y' : 'M';
  return `TEMPO-${segment()}-${segment()}-${segment()}-${suffix}`;
};

// Admin Config - Load defaults from config
export const getAdminConfig = async (): Promise<AdminConfig> => {
  const config = configManager.getConfig();
  const defaults: AdminConfig = {
    stripeMonthlyLink: '',
    stripeYearlyLink: '',
    maintenanceMode: config.defaults.admin.maintenanceMode,
    freeTrialEnabled: config.defaults.admin.freeTrialEnabled,
    freeTrialDays: config.defaults.admin.freeTrialDays,
    globalAccessEnabled: config.defaults.admin.globalAccessEnabled,
    globalAccessEndDate: null
  };
  const data = await storage.local.get('adminConfig');
  return { ...defaults, ...(data.adminConfig || {}) };
};

export const saveAdminConfig = async (config: Partial<AdminConfig>): Promise<void> => {
  const current = await getAdminConfig();
  await storage.local.set({ adminConfig: { ...current, ...config } });
};

// Tasks persistence
export const getTasks = async () => {
  const data = await storage.local.get('tasks');
  return data.tasks || [];
};

export const saveTasks = async (tasks: any[]): Promise<void> => {
  await storage.local.set({ tasks });
};

// Export all user data
export const exportUserData = async (): Promise<string> => {
  const settings = await getSettings();
  const stats = await getStats();
  const tasks = await getTasks();

  return JSON.stringify({ settings, stats, tasks, exportedAt: new Date().toISOString() }, null, 2);
};

// Export user data as CSV for Excel
export const exportUserDataAsCSV = async (): Promise<string> => {
  const stats = await getStats();
  const tasks = await getTasks();

  const sections: string[] = [];

  // 1. Stats Summary
  sections.push('STATS SUMMARY');
  sections.push('Total Sessions,Total Hours,Current Streak,Last Session');
  sections.push(`${stats.totalSessions},${(stats.totalFocusMinutes / 60).toFixed(1)},${stats.currentStreak},${stats.lastSessionDate || 'N/A'}`);
  sections.push('');

  // 2. Weekly Data
  sections.push('DAILY ACTIVITY (Last 7 Days)');
  sections.push('Date,Minutes');
  Object.entries(stats.weeklyData || {}).slice(-7).forEach(([date, mins]) => {
    sections.push(`${date},${mins}`);
  });
  sections.push('');

  // 3. Tasks
  sections.push('TASKS');
  sections.push('Title,Status,Priority,Category,Due Date,Notes');
  tasks.forEach(t => {
    const status = t.completed ? 'Completed' : 'Pending';
    // Escape commas in strings
    const title = `"${(t.title || '').replace(/"/g, '""')}"`;
    const notes = `"${(t.notes || '').replace(/"/g, '""')}"`;
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString() + ' ' + new Date(t.dueDate).toLocaleTimeString() : 'No Date';
    sections.push(`${title},${status},${t.priority},${t.category},${dueDate},${notes}`);
  });

  return sections.join('\n');
};
