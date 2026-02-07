import React from 'react';

export enum Screen {
  SPLASH = 'SPLASH',
  LOGIN = 'LOGIN',
  ONBOARDING = 'ONBOARDING',
  TIMER = 'TIMER',
  TASKS = 'TASKS',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS',
  PROFILE = 'PROFILE',
  SOCIAL = 'SOCIAL',
  QUICK_ADD = 'QUICK_ADD',
  AUDIO = 'AUDIO',
  MILESTONES = 'MILESTONES',
ADMIN = 'ADMIN',
  CALENDAR = 'CALENDAR',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  TERMS = 'TERMS',
  INTEGRATIONS = 'INTEGRATIONS',
  HEALTH = 'HEALTH'
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string; // ISO Date string
  completed: boolean;
  subtasks: Subtask[];
  createdAt: number; // Timestamp
  updatedAt?: number; // Timestamp
  notes?: string;
  milestoneId?: string;
  // Snooze/Reminder fields
  snoozedUntil?: string; // ISO Date string - when to remind again
  reminderEnabled?: boolean; // Whether to show due date reminder
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  color: string;
  progress: number; // 0-100
}

export interface NavProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

export interface AudioState {
  isPlaying: boolean;
  activeTrackId: string | null;
  youtubeId: string | null; // Store just the video ID
  volume: number; // Master volume 0-100
  autoPlay: boolean;
  // Granular settings per track ID
  trackSettings: Record<string, { volume: number; hz?: string }>;
}

export interface HealthSettings {
  enabled: boolean;
  screenBreakEnabled: boolean;
  screenBreakInterval: number; // minutes between reminders
  waterReminderEnabled: boolean;
  waterReminderInterval: number; // minutes between reminders
  stretchReminderEnabled: boolean;
  stretchReminderInterval: number; // minutes between reminders
  eyeRestEnabled: boolean; // 20-20-20 rule
  eyeRestInterval: number; // minutes
  posturCheckEnabled: boolean;
  postureCheckInterval: number; // minutes
}

export interface HealthLog {
  id: string;
  type: 'screen_break' | 'water' | 'stretch' | 'eye_rest' | 'posture';
  completedAt: number; // timestamp
  date: string; // YYYY-MM-DD
}

export interface GlobalProps {
  setScreen: (screen: Screen) => void;
  audioState: AudioState;
  setAudioState: React.Dispatch<React.SetStateAction<AudioState>>;
tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentTask: Task | null;
  setCurrentTask: React.Dispatch<React.SetStateAction<Task | null>>;
}