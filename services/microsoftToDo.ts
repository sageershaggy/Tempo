export class MicrosoftToDoService {
    private static instance: MicrosoftToDoService;
    private token: string | null = null;
    private CLIENT_ID = 'YOUR_MICROSOFT_CLIENT_ID'; // Placeholder

    private constructor() { }

    static getInstance(): MicrosoftToDoService {
        if (!MicrosoftToDoService.instance) {
            MicrosoftToDoService.instance = new MicrosoftToDoService();
        }
        return MicrosoftToDoService.instance;
    }

    async authenticate(): Promise<boolean> {
        console.log('[MS To Do] Authenticating...');
        try {
            // Real implementation w/ MSAL.js or chrome.identity
            // const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${this.CLIENT_ID}&response_type=token&redirect_uri=${chrome.identity.getRedirectURL()}&scope=Tasks.ReadWrite`;
            // const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
            // Extract token from responseUrl...

            this.token = 'mock-ms-token-' + Date.now();
            localStorage.setItem('ms_todo_token', this.token);
            return true;
        } catch (e) {
            console.error('MS Auth Failed:', e);
            return false;
        }
    }

    async getTaskLists(): Promise<any[]> {
        if (!this.token) throw new Error('Not authenticated');

        // if (this.token.startsWith('mock-')) {
        return [
            { id: '1', displayName: 'Tasks' },
            { id: '2', displayName: 'Important' },
            { id: '3', displayName: 'Groceries' }
        ];
        // }

        // Real API Call
        // const res = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
        //   headers: { Authorization: `Bearer ${this.token}` }
        // });
        // const data = await res.json();
        // return data.value;
    }

    async getTasks(listId: string): Promise<any[]> {
        if (!this.token) throw new Error('Not authenticated');

        // if (this.token.startsWith('mock-')) {
        return [
            { id: 'm1', title: 'Buy Milk (Microsoft)', status: 'notStarted', dueDateTime: { dateTime: new Date().toISOString() } },
            { id: 'm2', title: 'Schedule Dentist', status: 'completed' }
        ];
        // }

        // Real API Call
        // const res = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks`, {
        //   headers: { Authorization: `Bearer ${this.token}` }
        // });
        // const data = await res.json();
        // return data.value;
    }
}
