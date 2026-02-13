// Google Tasks Service - Real API integration with bidirectional sync
import { Task } from '../types';
import { authService } from './authService';

const API_BASE = 'https://tasks.googleapis.com/tasks/v1';
const MANIFEST_CLIENT_ID = '747255011734-l7k517kfa2908all500m6cmcs4iq1ugp.apps.googleusercontent.com';
const WEB_AUTH_FLOW_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
const HAS_WEB_AUTH_FLOW_CLIENT = WEB_AUTH_FLOW_CLIENT_ID.length > 0;
const AUTH_FLOW_TIMEOUT_MS = 120000;

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

export class GoogleTasksService {
  private static instance: GoogleTasksService;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('google_tasks_token');
  }

  static getInstance(): GoogleTasksService {
    if (!GoogleTasksService.instance) {
      GoogleTasksService.instance = new GoogleTasksService();
    }
    return GoogleTasksService.instance;
  }

  isConnected(): boolean {
    return !!this.token;
  }

  async authenticate(): Promise<boolean> {
    const isChromeExt = typeof chrome !== 'undefined' && chrome.identity?.getAuthToken;

    // Reuse an existing SSO token to avoid duplicate auth prompts.
    const existingAuthToken = authService.getToken();
    if (!this.token && existingAuthToken) {
      this.token = existingAuthToken;
      localStorage.setItem('google_tasks_token', existingAuthToken);
      return true;
    }

    if (!isChromeExt) {
      this.token = 'dev-google-tasks-' + Date.now();
      localStorage.setItem('google_tasks_token', this.token);
      return true;
    }

    // Try primary method first (getAuthToken uses manifest client_id)
    try {
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({
          interactive: true,
          scopes: ['https://www.googleapis.com/auth/tasks']
        }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (token) {
            resolve(token);
          } else {
            reject(new Error('No token'));
          }
        });
      });

      this.token = token;
      localStorage.setItem('google_tasks_token', token);
      return true;
    } catch (primaryError: any) {
      const primaryMessage = this.formatAuthError(primaryError);
      console.warn('[Google Tasks] getAuthToken failed, trying webAuthFlow:', primaryMessage);
      if (primaryMessage === 'Google sign-in was canceled or denied.') {
        return false;
      }
      if (!HAS_WEB_AUTH_FLOW_CLIENT) {
        const redirectUrl = chrome.identity?.getRedirectURL?.() || 'https://<extension-id>.chromiumapp.org/';
        console.error('[Google Tasks] Missing web OAuth fallback config:', redirectUrl);
        return false;
      }
    }

    // Fallback: launchWebAuthFlow
    try {
      const token = await new Promise<string>((resolve, reject) => {
        if (!HAS_WEB_AUTH_FLOW_CLIENT) {
          reject(new Error('Missing VITE_GOOGLE_OAUTH_CLIENT_ID for web auth fallback.'));
          return;
        }

        const redirectUrl = chrome.identity.getRedirectURL();
        const scopes = encodeURIComponent('https://www.googleapis.com/auth/tasks');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(WEB_AUTH_FLOW_CLIENT_ID)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${scopes}&prompt=consent&include_granted_scopes=true`;
        const timeoutId = setTimeout(() => {
          reject(new Error('Google Tasks sign-in timed out. Please try again.'));
        }, AUTH_FLOW_TIMEOUT_MS);

        chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          (responseUrl) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!responseUrl) {
              reject(new Error(`No response from auth flow (redirect: ${redirectUrl})`));
              return;
            }
            const url = new URL(responseUrl);
            const params = new URLSearchParams(url.hash.startsWith('#') ? url.hash.substring(1) : url.hash);
            const accessToken = params.get('access_token') || url.searchParams.get('access_token');
            if (accessToken) {
              resolve(accessToken);
            } else {
              const oauthError = params.get('error') || url.searchParams.get('error');
              if (oauthError) {
                reject(new Error(`Google OAuth error: ${oauthError}`));
              } else {
                reject(new Error('No access token in response'));
              }
            }
          }
        );
      });

      this.token = token;
      localStorage.setItem('google_tasks_token', token);
      return true;
    } catch (fallbackError: any) {
      console.error('[Google Tasks] Both auth methods failed:', this.formatAuthError(fallbackError));
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.token = null;
    localStorage.removeItem('google_tasks_token');
    localStorage.removeItem('tempo_google_last_sync');
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) throw new Error('Not authenticated');

    if (this.token.startsWith('dev-')) {
      return this.getMockData(endpoint, options) as T;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (res.status === 401) {
      const refreshed = await this.authenticate();
      if (refreshed) {
        const retryRes = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!retryRes.ok) throw new Error(`API error: ${retryRes.status}`);
        return retryRes.json();
      }
      throw new Error('Token refresh failed');
    }

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    if (res.status === 204) return {} as T;
    return res.json();
  }

  async getTaskLists(): Promise<GoogleTaskList[]> {
    const data = await this.apiCall<{ items?: GoogleTaskList[] }>('/users/@me/lists');
    return data.items || [];
  }

  async getTasks(listId: string = '@default'): Promise<GoogleTask[]> {
    const data = await this.apiCall<{ items?: GoogleTask[] }>(
      `/lists/${listId}/tasks?showCompleted=true&showHidden=true&maxResults=100`
    );
    return data.items || [];
  }

  async createTask(listId: string = '@default', title: string, notes?: string, dueDate?: string): Promise<GoogleTask> {
    const body: any = { title, notes };
    if (dueDate) body.due = new Date(dueDate).toISOString();
    return this.apiCall<GoogleTask>(`/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateTask(listId: string = '@default', taskId: string, updates: Partial<GoogleTask>): Promise<GoogleTask> {
    return this.apiCall<GoogleTask>(`/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(listId: string = '@default', taskId: string): Promise<void> {
    await this.apiCall<void>(`/lists/${listId}/tasks/${taskId}`, { method: 'DELETE' });
  }

  // Push Tempo tasks to Google
  async pushToGoogle(tempoTasks: Task[], listId: string = '@default'): Promise<{ created: number; updated: number }> {
    let created = 0, updated = 0;
    const googleTasks = await this.getTasks(listId);
    const googleTaskMap = new Map(googleTasks.map(t => [t.title, t]));

    for (const task of tempoTasks) {
      const existing = googleTaskMap.get(task.title);
      if (existing) {
        const googleStatus = task.completed ? 'completed' : 'needsAction';
        if (existing.status !== googleStatus) {
          await this.updateTask(listId, existing.id, { status: googleStatus });
          updated++;
        }
      } else {
        await this.createTask(listId, task.title, task.notes, task.dueDate);
        created++;
      }
    }
    return { created, updated };
  }

  // Pull Google Tasks into Tempo format
  async pullFromGoogle(listId: string = '@default'): Promise<Task[]> {
    const googleTasks = await this.getTasks(listId);
    return googleTasks.map(gt => ({
      id: `google-${gt.id}`,
      title: gt.title || 'Untitled',
      category: 'Personal',
      priority: 'Medium' as const,
      completed: gt.status === 'completed',
      subtasks: [],
      createdAt: gt.updated ? new Date(gt.updated).getTime() : Date.now(),
      updatedAt: gt.updated ? new Date(gt.updated).getTime() : Date.now(),
      dueDate: gt.due,
      notes: gt.notes,
    }));
  }

  // Full bidirectional sync
  async syncBidirectional(tempoTasks: Task[], listId: string = '@default'): Promise<{
    pushed: { created: number; updated: number };
    pulled: Task[];
  }> {
    const pushed = await this.pushToGoogle(tempoTasks, listId);
    const pulled = await this.pullFromGoogle(listId);
    localStorage.setItem('tempo_google_last_sync', String(Date.now()));
    return { pushed, pulled };
  }

  getLastSyncTime(): number | null {
    const ts = localStorage.getItem('tempo_google_last_sync');
    return ts ? parseInt(ts) : null;
  }

  private formatAuthError(error: any): string {
    const message = (error?.message || String(error) || 'Google Tasks authentication failed').trim();
    const lower = message.toLowerCase();
    const webClientLabel = WEB_AUTH_FLOW_CLIENT_ID || '<missing VITE_GOOGLE_OAUTH_CLIENT_ID>';

    if (lower.includes('redirect_uri_mismatch')) {
      const redirectUrl = chrome.identity?.getRedirectURL?.() || 'https://<extension-id>.chromiumapp.org/';
      return `Google OAuth redirect_uri mismatch. Add ${redirectUrl} to authorized redirect URIs for client ${webClientLabel}.`;
    }

    if (lower.includes('authorization page could not be loaded') || lower.includes('no response from auth flow')) {
      const redirectUrl = chrome.identity?.getRedirectURL?.() || 'https://<extension-id>.chromiumapp.org/';
      return `Google OAuth callback failed. Verify client ${webClientLabel} has authorized redirect URI ${redirectUrl}, then retry.`;
    }

    if (lower.includes('bad client id') || lower.includes('invalid_client')) {
      return `Google OAuth client ID is invalid or misconfigured (client: ${webClientLabel}).`;
    }

    if (lower.includes('access_denied')) {
      return 'Google sign-in was canceled or denied.';
    }

    return message;
  }

  private getMockData(endpoint: string, options: RequestInit): any {
    if (endpoint.includes('/users/@me/lists')) {
      return { items: [
        { id: 'list1', title: 'My Tasks' },
        { id: 'list2', title: 'Work' },
        { id: 'list3', title: 'Personal' },
      ]};
    }
    if (endpoint.includes('/tasks') && (!options.method || options.method === 'GET')) {
      return { items: [
        { id: 'gt1', title: 'Review Q3 Report', status: 'needsAction', updated: new Date().toISOString() },
        { id: 'gt2', title: 'Email Marketing Team', status: 'completed', updated: new Date().toISOString() },
        { id: 'gt3', title: 'Prepare Presentation', status: 'needsAction', due: new Date(Date.now() + 86400000).toISOString() },
      ]};
    }
    if (options.method === 'POST') {
      const body = JSON.parse(options.body as string || '{}');
      return { id: 'new-' + Date.now(), ...body, status: 'needsAction' };
    }
    if (options.method === 'PATCH') {
      return { id: 'updated', ...JSON.parse(options.body as string || '{}') };
    }
    return {};
  }
}

export const googleTasksService = GoogleTasksService.getInstance();
