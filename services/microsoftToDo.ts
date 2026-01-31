// Microsoft To Do Service - Real Graph API integration with bidirectional sync
import { Task } from '../types';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me/todo';
// Replace with your registered Azure AD App client ID
const MS_CLIENT_ID = 'YOUR_MICROSOFT_CLIENT_ID';

export interface MsToDoTask {
  id: string;
  title: string;
  body?: { content: string; contentType: string };
  status: 'notStarted' | 'completed' | 'inProgress' | 'waitingOnOthers' | 'deferred';
  dueDateTime?: { dateTime: string; timeZone: string };
  lastModifiedDateTime?: string;
}

export interface MsToDoList {
  id: string;
  displayName: string;
}

export class MicrosoftToDoService {
  private static instance: MicrosoftToDoService;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('ms_todo_token');
  }

  static getInstance(): MicrosoftToDoService {
    if (!MicrosoftToDoService.instance) {
      MicrosoftToDoService.instance = new MicrosoftToDoService();
    }
    return MicrosoftToDoService.instance;
  }

  isConnected(): boolean {
    return !!this.token;
  }

  async authenticate(): Promise<boolean> {
    const isChromeExt = typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow;

    if (!isChromeExt) {
      this.token = 'dev-ms-todo-' + Date.now();
      localStorage.setItem('ms_todo_token', this.token);
      return true;
    }

    try {
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${MS_CLIENT_ID}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
        `&scope=${encodeURIComponent('Tasks.ReadWrite openid profile email')}` +
        `&response_mode=fragment`;

      const responseUrl = await new Promise<string>((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (responseUrl) {
              resolve(responseUrl);
            } else {
              reject(new Error('No response URL'));
            }
          }
        );
      });

      // Extract token from URL fragment
      const hash = new URL(responseUrl).hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');

      if (!accessToken) throw new Error('No access token in response');

      this.token = accessToken;
      localStorage.setItem('ms_todo_token', this.token);
      return true;
    } catch (e) {
      console.error('[MS To Do] Auth failed:', e);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.token = null;
    localStorage.removeItem('ms_todo_token');
    localStorage.removeItem('tempo_ms_last_sync');
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) throw new Error('Not authenticated');

    if (this.token.startsWith('dev-')) {
      return this.getMockData(endpoint, options) as T;
    }

    const res = await fetch(`${GRAPH_BASE}${endpoint}`, {
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
        const retryRes = await fetch(`${GRAPH_BASE}${endpoint}`, {
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

  async getTaskLists(): Promise<MsToDoList[]> {
    const data = await this.apiCall<{ value?: MsToDoList[] }>('/lists');
    return data.value || [];
  }

  async getTasks(listId: string): Promise<MsToDoTask[]> {
    const data = await this.apiCall<{ value?: MsToDoTask[] }>(`/lists/${listId}/tasks`);
    return data.value || [];
  }

  async createTask(listId: string, title: string, notes?: string, dueDate?: string): Promise<MsToDoTask> {
    const body: any = { title };
    if (notes) body.body = { content: notes, contentType: 'text' };
    if (dueDate) body.dueDateTime = { dateTime: new Date(dueDate).toISOString(), timeZone: 'UTC' };

    return this.apiCall<MsToDoTask>(`/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateTask(listId: string, taskId: string, updates: Partial<MsToDoTask>): Promise<MsToDoTask> {
    return this.apiCall<MsToDoTask>(`/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(listId: string, taskId: string): Promise<void> {
    await this.apiCall<void>(`/lists/${listId}/tasks/${taskId}`, { method: 'DELETE' });
  }

  // Push Tempo tasks to Microsoft To Do
  async pushToMicrosoft(tempoTasks: Task[], listId: string): Promise<{ created: number; updated: number }> {
    let created = 0, updated = 0;
    const msTasks = await this.getTasks(listId);
    const msTaskMap = new Map(msTasks.map(t => [t.title, t]));

    for (const task of tempoTasks) {
      const existing = msTaskMap.get(task.title);
      if (existing) {
        const msStatus = task.completed ? 'completed' : 'notStarted';
        if (existing.status !== msStatus) {
          await this.updateTask(listId, existing.id, { status: msStatus });
          updated++;
        }
      } else {
        await this.createTask(listId, task.title, task.notes, task.dueDate);
        created++;
      }
    }
    return { created, updated };
  }

  // Pull Microsoft To Do tasks into Tempo format
  async pullFromMicrosoft(listId: string): Promise<Task[]> {
    const msTasks = await this.getTasks(listId);
    return msTasks.map(mt => ({
      id: `ms-${mt.id}`,
      title: mt.title || 'Untitled',
      category: 'Personal',
      priority: 'Medium' as const,
      completed: mt.status === 'completed',
      subtasks: [],
      createdAt: mt.lastModifiedDateTime ? new Date(mt.lastModifiedDateTime).getTime() : Date.now(),
      updatedAt: mt.lastModifiedDateTime ? new Date(mt.lastModifiedDateTime).getTime() : Date.now(),
      dueDate: mt.dueDateTime?.dateTime,
      notes: mt.body?.content,
    }));
  }

  // Full bidirectional sync
  async syncBidirectional(tempoTasks: Task[], listId: string): Promise<{
    pushed: { created: number; updated: number };
    pulled: Task[];
  }> {
    const pushed = await this.pushToMicrosoft(tempoTasks, listId);
    const pulled = await this.pullFromMicrosoft(listId);
    localStorage.setItem('tempo_ms_last_sync', String(Date.now()));
    return { pushed, pulled };
  }

  getLastSyncTime(): number | null {
    const ts = localStorage.getItem('tempo_ms_last_sync');
    return ts ? parseInt(ts) : null;
  }

  private getMockData(endpoint: string, options: RequestInit): any {
    if (endpoint === '/lists' && (!options.method || options.method === 'GET')) {
      return { value: [
        { id: 'mslist1', displayName: 'Tasks' },
        { id: 'mslist2', displayName: 'Important' },
        { id: 'mslist3', displayName: 'Work Projects' },
      ]};
    }
    if (endpoint.includes('/tasks') && (!options.method || options.method === 'GET')) {
      return { value: [
        { id: 'mt1', title: 'Schedule Dentist Appointment', status: 'notStarted', lastModifiedDateTime: new Date().toISOString() },
        { id: 'mt2', title: 'Buy Groceries', status: 'completed', lastModifiedDateTime: new Date().toISOString() },
        { id: 'mt3', title: 'Team Standup Notes', status: 'notStarted', dueDateTime: { dateTime: new Date(Date.now() + 86400000).toISOString(), timeZone: 'UTC' } },
      ]};
    }
    if (options.method === 'POST') {
      const body = JSON.parse(options.body as string || '{}');
      return { id: 'new-ms-' + Date.now(), ...body, status: 'notStarted' };
    }
    if (options.method === 'PATCH') {
      return { id: 'updated-ms', ...JSON.parse(options.body as string || '{}') };
    }
    return {};
  }
}

export const microsoftToDoService = MicrosoftToDoService.getInstance();
