// Centralized App Configuration
// All static values are now configurable and can be loaded dynamically

export interface AppConfig {
  app: AppInfo;
  timer: TimerConfig;
  audio: AudioConfig;
  themes: ThemeConfig[];
  navigation: NavItemConfig[];
  onboarding: OnboardingStepConfig[];
  categories: CategoryConfig;
  social: SocialConfig;
  admin: AdminAuthConfig;
  pricing: PricingConfig;
  defaults: DefaultsConfig;
}

export interface AppInfo {
  name: string;
  version: string;
  build: number;
  chromeWebStoreUrl: string;
}

export interface TimerConfig {
  modes: TimerModeConfig[];
  templates: TimerTemplateConfig[];
  sounds: string[];
  tickingSpeedRange: { min: number; max: number; step: number };
}

export interface TimerModeConfig {
  id: string;
  name: string;
  label: string;
  focusMinutes: number;
  breakMinutes: number;
}

export interface TimerTemplateConfig {
  id: string;
  focusMinutes: number;
  breakMinutes: number;
  label: string;
  description: string;
}

export interface AudioConfig {
  tracks: AudioTrackConfig[];
  categories: string[];
  binauralRanges: string[];
}

export interface AudioTrackConfig {
  id: string;
  name: string;
  category: string;
  hz?: string;
  icon: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  color: string;
  cssVar: string;
  pro: boolean;
}

export interface NavItemConfig {
  id: string;
  icon: string;
  label: string;
}

export interface OnboardingStepConfig {
  title: string;
  desc: string;
  icon: string;
  color: string;
}

export interface CategoryConfig {
  task: string[];
  defaultTaskCategory: string;
  iconMap: Record<string, string>;
  colorPalette: string[];
}

export interface SocialConfig {
  mockLeaderboard: LeaderboardUserConfig[];
  mockMilestones: MilestoneConfig[];
}

export interface MilestoneConfig {
  id: string;
  title: string;
  progress: number;
  color: string;
}

export interface LeaderboardUserConfig {
  name: string;
  hours: string;
  img: number;
  streak: number;
}

export interface AdminAuthConfig {
  // Note: In production, this should use proper authentication
  // This is a placeholder for secure hash comparison
  passwordHash: string;
}

export interface PricingConfig {
  monthly: { price: number; label: string };
  yearly: { price: number; label: string };
  testLicenseKeys: string[];
  licensePattern: RegExp;
}

export interface DefaultsConfig {
  audio: {
    volume: number;
    autoPlay: boolean;
  };
  settings: {
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
  };
  stats: {
    totalSessions: number;
    totalFocusMinutes: number;
    currentStreak: number;
  };
  admin: {
    freeTrialEnabled: boolean;
    freeTrialDays: number;
    maintenanceMode: boolean;
    globalAccessEnabled: boolean;
  };
}

// Default configuration - can be overridden by remote config or user settings
export const defaultAppConfig: AppConfig = {
  app: {
    name: 'Tempo Focus',
    version: '1.0.0',
    build: 1,
    chromeWebStoreUrl: 'https://chrome.google.com/webstore/category/extensions',
  },

  timer: {
    modes: [
      { id: 'pomodoro', name: 'Pomodoro', label: '25/5', focusMinutes: 25, breakMinutes: 5 },
      { id: 'deep', name: 'Deep Work', label: '50/10', focusMinutes: 50, breakMinutes: 10 },
      { id: 'custom', name: 'Custom', label: 'Custom', focusMinutes: 45, breakMinutes: 10 },
    ],
    templates: [
      { id: 'classic', focusMinutes: 25, breakMinutes: 5, label: '25/5', description: 'Classic' },
      { id: 'deep-work', focusMinutes: 50, breakMinutes: 10, label: '50/10', description: 'Deep Work' },
      { id: 'ultra-focus', focusMinutes: 90, breakMinutes: 20, label: '90/20', description: 'Ultra Focus' },
      { id: 'custom', focusMinutes: 25, breakMinutes: 5, label: 'Custom', description: 'Custom' },
    ],
    sounds: ['Desk Clock', 'Digital Beep', 'Gentle Chime', 'Bell Ring', 'None'],
    tickingSpeedRange: { min: 1, max: 120, step: 1 },
  },

  audio: {
    tracks: [
      // Binaural
      { id: '1', name: 'Gamma Focus', category: 'Binaural', hz: '40 Hz', icon: 'waves' },
      { id: '2', name: 'Beta Study', category: 'Binaural', hz: '14 Hz', icon: 'psychology' },
      { id: '16', name: 'Theta Meditation', category: 'Binaural', hz: '6 Hz', icon: 'self_improvement' },
      { id: '17', name: 'Delta Sleep', category: 'Binaural', hz: '2 Hz', icon: 'bedtime' },
      { id: '3', name: 'Alpha Flow', category: 'Binaural', hz: '10 Hz', icon: 'water_drop' },
      // Solfeggio
      { id: '4', name: 'Deep Restoration', category: 'Solfeggio', hz: '432 Hz', icon: 'spa' },
      { id: '5', name: 'Miracle Tone', category: 'Solfeggio', hz: '528 Hz', icon: 'music_note' },
      // Ambience
      { id: '6', name: 'Heavy Rain', category: 'Ambience', icon: 'rainy' },
      { id: '7', name: 'Coffee Shop', category: 'Ambience', icon: 'storefront' },
      { id: '11', name: 'Forest Stream', category: 'Ambience', icon: 'forest' },
      { id: '12', name: 'Ocean Waves', category: 'Ambience', icon: 'surfing' },
      { id: '13', name: 'Crackling Fire', category: 'Ambience', icon: 'fireplace' },
      { id: '14', name: 'Night Crickets', category: 'Ambience', icon: 'nights_stay' },
      { id: '15', name: 'Wind Chimes', category: 'Ambience', icon: 'air' },
      // Noise
      { id: '8', name: 'Brown Noise', category: 'Noise', icon: 'graphic_eq' },
      { id: '9', name: 'White Noise', category: 'Noise', icon: 'noise_aware' },
      { id: '10', name: 'Pink Noise', category: 'Noise', icon: 'blur_on' },
      // Music
      { id: '18', name: 'Lo-Fi Beats', category: 'Music', icon: 'headphones' },
    ],
    categories: ['All', 'Binaural', 'Ambience', 'Solfeggio', 'Noise', 'Music'],
    binauralRanges: ['Low', 'Mid', 'High'],
  },

  themes: [
    // Free Themes (7)
    { id: 'default', name: 'Royal Purple', color: 'bg-gradient-to-br from-[#7F13EC] to-[#5a0db5]', cssVar: '#7F13EC', pro: false },
    { id: 'ocean', name: 'Ocean', color: 'bg-gradient-to-br from-[#06B6D4] to-[#3B82F6]', cssVar: '#0EA5E9', pro: false },
    { id: 'emerald', name: 'Emerald', color: 'bg-gradient-to-br from-[#059669] to-[#065F46]', cssVar: '#059669', pro: false },
    { id: 'coral', name: 'Coral', color: 'bg-gradient-to-br from-[#FB7185] to-[#F43F5E]', cssVar: '#FB7185', pro: false },
    { id: 'slate', name: 'Slate', color: 'bg-gradient-to-br from-[#475569] to-[#1E293B]', cssVar: '#475569', pro: false },
    { id: 'crimson', name: 'Crimson', color: 'bg-gradient-to-br from-[#DC2626] to-[#7F1D1D]', cssVar: '#DC2626', pro: false },
    { id: 'indigo', name: 'Indigo', color: 'bg-gradient-to-br from-[#4F46E5] to-[#312E81]', cssVar: '#4F46E5', pro: false },
    // Pro Themes (14)
    { id: 'nebula', name: 'Nebula', color: 'bg-gradient-to-br from-[#6366F1] to-[#D946EF]', cssVar: '#8B5CF6', pro: true },
    { id: 'sunset', name: 'Sunset', color: 'bg-gradient-to-br from-[#F59E0B] to-[#EF4444]', cssVar: '#F97316', pro: true },
    { id: 'midnight', name: 'Midnight', color: 'bg-gradient-to-br from-[#1E293B] to-[#0F172A]', cssVar: '#64748B', pro: true },
    { id: 'rose', name: 'Rose', color: 'bg-gradient-to-br from-[#E11D48] to-[#9F1239]', cssVar: '#E11D48', pro: true },
    { id: 'amber', name: 'Amber', color: 'bg-gradient-to-br from-[#D97706] to-[#92400E]', cssVar: '#D97706', pro: true },
    { id: 'arctic', name: 'Arctic', color: 'bg-gradient-to-br from-[#38BDF8] to-[#818CF8]', cssVar: '#38BDF8', pro: true },
    { id: 'forest', name: 'Forest', color: 'bg-gradient-to-br from-[#22C55E] to-[#15803D]', cssVar: '#22C55E', pro: true },
    { id: 'aurora', name: 'Aurora', color: 'bg-gradient-to-br from-[#34D399] to-[#6366F1]', cssVar: '#34D399', pro: true },
    { id: 'sakura', name: 'Sakura', color: 'bg-gradient-to-br from-[#F9A8D4] to-[#C084FC]', cssVar: '#F472B6', pro: true },
    { id: 'volcano', name: 'Volcano', color: 'bg-gradient-to-br from-[#FF6B35] to-[#C81D25]', cssVar: '#FF6B35', pro: true },
    { id: 'cyber', name: 'Cyber', color: 'bg-gradient-to-br from-[#00F5D4] to-[#7B2FF7]', cssVar: '#00F5D4', pro: true },
    { id: 'mocha', name: 'Mocha', color: 'bg-gradient-to-br from-[#A0845C] to-[#5C4033]', cssVar: '#A0845C', pro: true },
    { id: 'nord', name: 'Nord', color: 'bg-gradient-to-br from-[#88C0D0] to-[#5E81AC]', cssVar: '#88C0D0', pro: true },
    { id: 'lavender', name: 'Lavender', color: 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]', cssVar: '#A78BFA', pro: true },
    { id: 'mint', name: 'Mint', color: 'bg-gradient-to-br from-[#6EE7B7] to-[#34D399]', cssVar: '#6EE7B7', pro: true },
    { id: 'candy', name: 'Candy', color: 'bg-gradient-to-br from-[#F472B6] to-[#EC4899]', cssVar: '#F472B6', pro: true },
    { id: 'steel', name: 'Steel', color: 'bg-gradient-to-br from-[#94A3B8] to-[#64748B]', cssVar: '#94A3B8', pro: true },
    { id: 'gold', name: 'Gold', color: 'bg-gradient-to-br from-[#FCD34D] to-[#F59E0B]', cssVar: '#FCD34D', pro: true },
    { id: 'neon', name: 'Neon', color: 'bg-gradient-to-br from-[#84CC16] to-[#22C55E]', cssVar: '#84CC16', pro: true },
    { id: 'grape', name: 'Grape', color: 'bg-gradient-to-br from-[#A855F7] to-[#7E22CE]', cssVar: '#A855F7', pro: true },
  ],

  navigation: [
    { id: 'TIMER', icon: 'timer', label: 'Timer' },
    { id: 'TASKS', icon: 'check_circle', label: 'Tasks' },
    { id: 'STATS', icon: 'bar_chart', label: 'Stats' },
    { id: 'SOCIAL', icon: 'group', label: 'Social' },
    { id: 'PROFILE', icon: 'person', label: 'Profile' },
  ],

  onboarding: [
    {
      title: 'Master Your Focus',
      desc: 'Stay in the zone with our customizable Pomodoro timer designed for deep work sessions.',
      icon: 'timer',
      color: 'text-primary',
    },
    {
      title: 'Set the Vibe',
      desc: 'Enhance concentration with binaural beats, brown noise, and custom soundscapes.',
      icon: 'graphic_eq',
      color: 'text-secondary',
    },
    {
      title: 'Track Progress',
      desc: 'Visualize your daily habits with detailed task history and performance analytics.',
      icon: 'bar_chart',
      color: 'text-blue-500',
    },
  ],

  categories: {
    task: ['Design System', 'Marketing', 'Development', 'Personal'],
    defaultTaskCategory: 'Design System',
    iconMap: {
      Finance: 'attach_money',
      Development: 'code',
      Design: 'palette',
      Marketing: 'campaign',
      Research: 'science',
      Writing: 'edit_note',
      Meeting: 'groups',
      'Project A': 'folder',
      'Design System': 'design_services',
      Personal: 'person',
    },
    colorPalette: [
      '#7F13EC', '#FF6B6B', '#1E3A8A', '#059669', '#EA580C',
      '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1',
    ],
  },

  social: {
    mockLeaderboard: [
      { name: 'Sarah', hours: '48h', img: 1027, streak: 12 },
      { name: 'Mike', hours: '32h', img: 1012, streak: 8 },
      { name: 'Jess', hours: '28h', img: 1011, streak: 5 },
      { name: 'Alex Chen', hours: '42h', img: 1005, streak: 4 },
      { name: 'Jordan Lee', hours: '38h', img: 1014, streak: 3 },
      { name: 'Casey West', hours: '12h', img: 1024, streak: 0 },
    ],
    mockMilestones: [
      { id: 'm1', title: 'Launch MVP Beta', progress: 75, color: 'bg-primary' },
      { id: 'm2', title: 'Complete User Research', progress: 100, color: 'bg-secondary' },
      { id: 'm3', title: 'Design System v2', progress: 30, color: 'bg-blue-500' },
    ],
  },

  admin: {
    // In production, use proper auth with bcrypt or similar
    // This is a SHA-256 hash of 'admin123' for demo purposes
    passwordHash: 'admin@345', // TODO: Replace with secure authentication
  },

  pricing: {
    monthly: { price: 1, label: '$1/mo' },
    yearly: { price: 10, label: '$10/yr' },
    testLicenseKeys: ['TEST-KEY-2024', 'TEMPO-TEST-KEY-2024'],
    licensePattern: /^TEMPO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-(M|Y)$/,
  },

  defaults: {
    audio: {
      volume: 70,
      autoPlay: false,
    },
    settings: {
      focusDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartPomos: false,
      notifications: true,
      darkMode: true,
      theme: 'default',
      tickingEnabled: false,
      tickingSpeed: 60,
    },
    stats: {
      totalSessions: 0,
      totalFocusMinutes: 0,
      currentStreak: 0,
    },
    admin: {
      freeTrialEnabled: true,
      freeTrialDays: 7,
      maintenanceMode: false,
      globalAccessEnabled: false,
    },
  },
};

// Config manager for loading and accessing configuration
class ConfigManager {
  private config: AppConfig = defaultAppConfig;
  private loaded = false;

  constructor() {
    // Load synchronously from localStorage on construction so getConfig() always has saved data
    try {
      const savedConfig = localStorage.getItem('tempo_app_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = this.mergeConfig(defaultAppConfig, parsed);
        this.loaded = true;
      }
    } catch (error) {
      console.error('Failed to load config from localStorage:', error);
    }
  }

  async loadConfig(): Promise<AppConfig> {
    if (this.loaded) return this.config;

    try {
      // Try to load from localStorage (user customizations)
      const savedConfig = localStorage.getItem('tempo_app_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = this.mergeConfig(defaultAppConfig, parsed);
      }

      // In production, could also fetch from remote API
      // const remoteConfig = await fetch('/api/config').then(r => r.json());
      // this.config = this.mergeConfig(this.config, remoteConfig);

      this.loaded = true;
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = defaultAppConfig;
    }

    return this.config;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  async saveConfig(updates: Partial<AppConfig>): Promise<void> {
    this.config = this.mergeConfig(this.config, updates);
    localStorage.setItem('tempo_app_config', JSON.stringify(this.config));
  }

  private mergeConfig(base: AppConfig, updates: Partial<AppConfig>): AppConfig {
    return {
      ...base,
      ...updates,
      app: { ...base.app, ...updates.app },
      timer: { ...base.timer, ...updates.timer },
      audio: { ...base.audio, ...updates.audio },
      categories: { ...base.categories, ...updates.categories },
      social: { ...base.social, ...updates.social },
      admin: { ...base.admin, ...updates.admin },
      pricing: { ...base.pricing, ...updates.pricing },
      defaults: {
        ...base.defaults,
        ...updates.defaults,
        audio: { ...base.defaults.audio, ...updates.defaults?.audio },
        settings: { ...base.defaults.settings, ...updates.defaults?.settings },
        stats: { ...base.defaults.stats, ...updates.defaults?.stats },
        admin: { ...base.defaults.admin, ...updates.defaults?.admin },
      },
      // Always use base themes (from code) - don't cache themes in localStorage
      themes: base.themes,
      navigation: updates.navigation || base.navigation,
      onboarding: updates.onboarding || base.onboarding,
    };
  }

  // Utility methods for common config access
  getTimerMode(modeId: string): TimerModeConfig | undefined {
    return this.config.timer.modes.find(m => m.id === modeId);
  }

  getTrack(trackId: string): AudioTrackConfig | undefined {
    return this.config.audio.tracks.find(t => t.id === trackId);
  }

  getTheme(themeId: string): ThemeConfig | undefined {
    return this.config.themes.find(t => t.id === themeId);
  }

  getCategoryIcon(category: string): string {
    return this.config.categories.iconMap[category] || 'folder';
  }
}

export const configManager = new ConfigManager();
export default configManager;
