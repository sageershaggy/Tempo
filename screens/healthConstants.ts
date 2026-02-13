import { HealthTypeConfig } from '../types';

export const HEALTH_TYPES = [
  { id: 'screen_break' as const, label: 'Screen Break', icon: 'visibility_off', color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Look away from screen' },
  { id: 'water' as const, label: 'Drink Water', icon: 'water_drop', color: 'text-cyan-400', bg: 'bg-cyan-500/10', desc: 'Stay hydrated' },
  { id: 'stretch' as const, label: 'Stretch', icon: 'self_improvement', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Stand up and move' },
  { id: 'eye_rest' as const, label: 'Eye Rest', icon: 'remove_red_eye', color: 'text-purple-400', bg: 'bg-purple-500/10', desc: '20-20-20 rule' },
  { id: 'posture' as const, label: 'Posture', icon: 'accessibility_new', color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Sit up straight' },
];

export const INTERVAL_OPTIONS: { value: 15 | 30 | 45 | 60; label: string }[] = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
];

export const DEFAULT_HEALTH_TYPE_CONFIG: HealthTypeConfig = {
  enabled: true,
  reminderCount: 3,
  intervalMinutes: 30,
};

