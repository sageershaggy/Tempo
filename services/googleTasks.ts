export class GoogleTasksService {
    private static instance: GoogleTasksService;
    private token: string | null = null;
    private CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Placeholder

    private constructor() { }

    static getInstance(): GoogleTasksService {
        if (!GoogleTasksService.instance) {
            GoogleTasksService.instance = new GoogleTasksService();
        }
        return GoogleTasksService.instance;
    }

    async authenticate(): Promise<boolean> {
        console.log('[Google Tasks] Authenticating...');
        try {
            // Real implementation would be:
            // const response = await chrome.identity.getAuthToken({ interactive: true });
            // this.token = response.token;

            // For demo purposes, we simulate success
            this.token = 'mock-google-token-' + Date.now();
            localStorage.setItem('google_tasks_token', this.token);
            return true;
        } catch (e) {
            console.error('Google Auth Failed:', e);
            return false;
        }
    }

    async getTaskLists(): Promise<any[]> {
        if (!this.token) throw new Error('Not authenticated');

        // if (this.token.startsWith('mock-')) {
        // Return mock data for demo
        return [
            { id: '1', title: 'My Tasks' },
            { id: '2', title: 'Work Projects' },
            { id: '3', title: 'Personal' }
        ];
        // }

        // Real API Call
        // const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        //   headers: { Authorization: `Bearer ${this.token}` }
        // });
        // const data = await res.json();
        // return data.items;
    }

    async getTasks(listId: string): Promise<any[]> {
        if (!this.token) throw new Error('Not authenticated');

        // if (this.token.startsWith('mock-')) {
        return [
            { id: `g-1`, title: 'Review Q3 Financials (Google)', status: 'needsAction', due: new Date().toISOString() },
            { id: `g-2`, title: 'Email Marketing Team', status: 'completed' }
        ];
        // }

        // Real API Call
        // const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
        //   headers: { Authorization: `Bearer ${this.token}` }
        // });
        // const data = await res.json();
        // return data.items;
    }

    async createTask(listId: string, title: string, notes?: string): Promise<any> {
        if (!this.token) throw new Error('Not authenticated');

        console.log(`[Google Tasks] Creating task "${title}" in list ${listId}`);
        // Real API Call
        // const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
        //   method: 'POST',
        //   headers: { 
        //       Authorization: `Bearer ${this.token}`,
        //       'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({ title, notes })
        // });
        // return await res.json();

        return { id: 'new-g-' + Date.now(), title, status: 'needsAction' };
    }
}
