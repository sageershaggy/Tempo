// Chrome Storage Service for Tempo Focus

export interface UserSettings {
  focusDuration: number;
  shortBreak: number;
  longBreak: number;
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

// Settings
export const getSettings = async (): Promise<UserSettings> => {
  const defaults: UserSettings = {
    focusDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStartBreaks: false,
    autoStartPomos: false,
    notifications: true,
    darkMode: true,
    theme: 'default',
    tickingEnabled: false,
    tickingSpeed: 60
  };
  const data = await storage.sync.get('settings');
  return { ...defaults, ...(data.settings || {}) };
};

export const saveSettings = async (settings: Partial<UserSettings>): Promise<void> => {
  const current = await getSettings();
  await storage.sync.set({ settings: { ...current, ...settings } });
};

// Stats
export const getStats = async (): Promise<UserStats> => {
  const defaults: UserStats = {
    totalSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    lastSessionDate: null,
    weeklyData: {}
  };
  const data = await storage.sync.get('stats');
  return { ...defaults, ...(data.stats || {}) };
};

export const updateStats = async (sessionMinutes: number): Promise<void> => {
  const stats = await getStats();
  const today = new Date().toISOString().split('T')[0];

  // Update streak
  if (stats.lastSessionDate) {
    const lastDate = new Date(stats.lastSessionDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
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
  stats.weeklyData[today] = (stats.weeklyData[today] || 0) + sessionMinutes;

  await storage.sync.set({ stats });
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
    ? Date.now() + (365 * 24 * 60 * 60 * 1000)
    : Date.now() + (30 * 24 * 60 * 60 * 1000);

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
  // License format: TEMPO-XXXX-XXXX-XXXX-M or TEMPO-XXXX-XXXX-XXXX-Y
  const pattern = /^TEMPO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-(M|Y)$/;
  const match = key.toUpperCase().match(pattern);

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

// Admin Config
export const getAdminConfig = async (): Promise<AdminConfig> => {
  const defaults: AdminConfig = {
    stripeMonthlyLink: '',
    stripeYearlyLink: '',
    maintenanceMode: false,
    freeTrialEnabled: true,
    freeTrialDays: 7,
    globalAccessEnabled: false,
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
  const data = await storage.sync.get('tasks');
  return data.tasks || [];
};

export const saveTasks = async (tasks: any[]): Promise<void> => {
  await storage.sync.set({ tasks });
};

// Export all user data
export const exportUserData = async (): Promise<string> => {
  const settings = await getSettings();
  const stats = await getStats();
  const tasks = await getTasks();

  return JSON.stringify({ settings, stats, tasks, exportedAt: new Date().toISOString() }, null, 2);
};
