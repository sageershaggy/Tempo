// Centralized Constants
// All localStorage keys, default values, and magic numbers in one place

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  // User Data
  USER_PROFILE: 'tempo_userProfile',
  USER_SETTINGS: 'tempo_settings',
  USER_STATS: 'tempo_stats',
  USER_TASKS: 'tempo_tasks',
  USER_MILESTONES: 'tempo_milestones',

  // Timer State
  TIMER_TARGET: 'tempo_timer_target',
  TIMER_MODE: 'tempo_timer_mode',
  TIMER_ACTIVE: 'tempo_timer_active',

  // App State
  ONBOARDING_COMPLETE: 'tempo_onboarding_complete',
  APP_CONFIG: 'tempo_app_config',

  // Pro Features
  IS_PRO: 'tempo_isPro',
  PRO_EXPIRY: 'tempo_proExpiry',
  LICENSE_KEY: 'tempo_licenseKey',
  ACTIVATED_AT: 'tempo_activatedAt',
  PLAN: 'tempo_plan',

  // Admin
  ADMIN_CONFIG: 'tempo_adminConfig',
  ADMIN_AUTH_TOKEN: 'tempo_adminAuthToken',

  // Feedback
  FEEDBACK_REPORTS: 'tempo_feedback_reports',

  // Audio
  AUDIO_STATE: 'tempo_audioState',
} as const;

// Type for storage keys
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ============================================================================
// UI DIMENSIONS
// ============================================================================

export const UI_DIMENSIONS = {
  // Extension popup dimensions
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 600,

  // Timer circle
  TIMER_CIRCLE_SIZE: 48,
  TIMER_STROKE_WIDTH: 6,
  TIMER_RADIUS: 45,
  TIMER_CIRCUMFERENCE: 283,

  // Avatar sizes
  AVATAR_SM: 32,
  AVATAR_MD: 48,
  AVATAR_LG: 64,
  AVATAR_XL: 96,
} as const;

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const TIME = {
  // Milliseconds
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH_30: 30 * 24 * 60 * 60 * 1000,
  YEAR_365: 365 * 24 * 60 * 60 * 1000,

  // Seconds
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,

  // Animation durations (ms)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,

  // Debounce/throttle (ms)
  DEBOUNCE_SHORT: 100,
  DEBOUNCE_NORMAL: 300,
  DEBOUNCE_LONG: 500,

  // Auto-save interval (ms)
  AUTO_SAVE_INTERVAL: 5000,
} as const;

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const LIMITS = {
  // Timer
  MIN_FOCUS_DURATION: 5,
  MAX_FOCUS_DURATION: 90,
  MIN_BREAK_DURATION: 1,
  MAX_BREAK_DURATION: 30,
  MIN_LONG_BREAK: 10,
  MAX_LONG_BREAK: 60,
  MIN_LONG_BREAK_INTERVAL: 2,
  MAX_LONG_BREAK_INTERVAL: 10,

  // Ticking
  MIN_TICKING_SPEED: 30,
  MAX_TICKING_SPEED: 120,

  // Volume
  MIN_VOLUME: 0,
  MAX_VOLUME: 100,

  // Text
  MAX_TASK_TITLE_LENGTH: 200,
  MAX_TASK_NOTES_LENGTH: 1000,
  MAX_MILESTONE_TITLE_LENGTH: 100,

  // Lists
  MAX_SUBTASKS: 20,
  MAX_TASKS_DISPLAY: 100,
} as const;

// ============================================================================
// SCREEN IDENTIFIERS
// ============================================================================

export const SCREENS = {
  SPLASH: 'SPLASH',
  LOGIN: 'LOGIN',
  ONBOARDING: 'ONBOARDING',
  TIMER: 'TIMER',
  TASKS: 'TASKS',
  STATS: 'STATS',
  SETTINGS: 'SETTINGS',
  PROFILE: 'PROFILE',
  SOCIAL: 'SOCIAL',
  QUICK_ADD: 'QUICK_ADD',
  AUDIO: 'AUDIO',
  MILESTONES: 'MILESTONES',
  TEMPO_PRO: 'TEMPO_PRO',
  ADMIN: 'ADMIN',
  CALENDAR: 'CALENDAR',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  TERMS: 'TERMS',
  INTEGRATIONS: 'INTEGRATIONS',
} as const;

export type ScreenId = typeof SCREENS[keyof typeof SCREENS];

// Screens that should hide the bottom navigation
export const SCREENS_WITHOUT_NAV: ScreenId[] = [
  SCREENS.SPLASH,
  SCREENS.LOGIN,
  SCREENS.ONBOARDING,
  SCREENS.QUICK_ADD,
];

// ============================================================================
// PRIORITY LEVELS
// ============================================================================

export const PRIORITIES = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

export type Priority = typeof PRIORITIES[keyof typeof PRIORITIES];

export const PRIORITY_COLORS = {
  [PRIORITIES.HIGH]: 'text-red-500',
  [PRIORITIES.MEDIUM]: 'text-yellow-500',
  [PRIORITIES.LOW]: 'text-green-500',
} as const;

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export const PLANS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export type Plan = typeof PLANS[keyof typeof PLANS];

// ============================================================================
// FEEDBACK TYPES
// ============================================================================

export const FEEDBACK_TYPES = {
  BUG: 'bug',
  FEEDBACK: 'feedback',
  HELP: 'help',
} as const;

export type FeedbackType = typeof FEEDBACK_TYPES[keyof typeof FEEDBACK_TYPES];

// ============================================================================
// CSS VARIABLES (for dynamic theming)
// ============================================================================

export const CSS_VARS = {
  PRIMARY: '--color-primary',
  SECONDARY: '--color-secondary',
  BACKGROUND_DARK: '--color-background-dark',
  SURFACE_DARK: '--color-surface-dark',
  SURFACE_LIGHT: '--color-surface-light',
  MUTED: '--color-muted',
} as const;

// ============================================================================
// API ENDPOINTS (placeholder for future backend)
// ============================================================================

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',

  // User
  USER_PROFILE: '/api/user/profile',
  USER_SETTINGS: '/api/user/settings',
  USER_STATS: '/api/user/stats',

  // Tasks
  TASKS: '/api/tasks',
  MILESTONES: '/api/milestones',

  // Social
  LEADERBOARD: '/api/social/leaderboard',
  FRIENDS: '/api/social/friends',
  INVITE: '/api/social/invite',

  // Pro
  VERIFY_LICENSE: '/api/pro/verify',
  ACTIVATE_LICENSE: '/api/pro/activate',

  // Admin
  ADMIN_CONFIG: '/api/admin/config',
  ADMIN_USERS: '/api/admin/users',

  // Config
  REMOTE_CONFIG: '/api/config',
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  LICENSE_KEY: /^TEMPO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-(M|Y)$/,
  YOUTUBE_URL: /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
} as const;

// ============================================================================
// EXTERNAL URLS
// ============================================================================

export const EXTERNAL_URLS = {
  PICSUM_PHOTOS: 'https://picsum.photos',
  YOUTUBE_EMBED: 'https://www.youtube.com/embed',
  CHROME_WEB_STORE: 'https://chrome.google.com/webstore',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a storage key with the tempo prefix
 */
export function getStorageKey(key: string): string {
  return `tempo_${key}`;
}

/**
 * Format minutes to display string
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format seconds to MM:SS
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate timer progress (0-1)
 */
export function calculateProgress(elapsed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, elapsed / total));
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a license key format is valid
 */
export function isValidLicenseFormat(key: string): boolean {
  return PATTERNS.LICENSE_KEY.test(key.toUpperCase());
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(PATTERNS.YOUTUBE_URL);
  return match && match[2].length === 11 ? match[2] : null;
}
