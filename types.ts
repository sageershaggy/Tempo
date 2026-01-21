export enum Screen {
  SPLASH = 'SPLASH',
  ONBOARDING = 'ONBOARDING',
  TIMER = 'TIMER',
  TASKS = 'TASKS',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS',
  PROFILE = 'PROFILE',
  SOCIAL = 'SOCIAL',
  QUICK_ADD = 'QUICK_ADD',
  AUDIO = 'AUDIO',
  MILESTONES = 'MILESTONES'
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
}

export interface NavProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}