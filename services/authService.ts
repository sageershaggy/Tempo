// Authentication Service - Google SSO via Chrome Identity API
// Handles OAuth flow, token management, and user profile

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
  id: string;
}

const STORAGE_KEY = 'tempo_auth';
const TOKEN_KEY = 'tempo_google_token';

const isChromeExtension = typeof chrome !== 'undefined' && chrome.identity?.getAuthToken;

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private profile: UserProfile | null = null;

  private constructor() {
    // Load cached token and profile
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.profile = data.profile || null;
        this.token = data.token || null;
      }
    } catch (e) {}
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.profile;
  }

  getToken(): string | null {
    return this.token;
  }

  getProfile(): UserProfile | null {
    return this.profile;
  }

  // Google Sign-In via Chrome Identity API
  async signInWithGoogle(): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    if (!isChromeExtension) {
      // Fallback for development/non-extension context - simulate login
      return this.simulateLogin();
    }

    try {
      // Use Chrome's built-in OAuth2 flow
      const tokenResponse = await new Promise<{ token: string }>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (token) {
            resolve({ token });
          } else {
            reject(new Error('No token received'));
          }
        });
      });

      this.token = tokenResponse.token;

      // Fetch user profile from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (!profileRes.ok) {
        throw new Error('Failed to fetch profile');
      }

      const profileData = await profileRes.json();
      this.profile = {
        email: profileData.email,
        name: profileData.name,
        picture: profileData.picture,
        id: profileData.id,
      };

      // Persist auth state
      this.saveState();

      return { success: true, profile: this.profile };
    } catch (error: any) {
      console.error('[Auth] Google sign-in failed:', error);
      return { success: false, error: error.message || 'Sign-in failed' };
    }
  }

  // Sign out - revoke token and clear state
  async signOut(): Promise<void> {
    if (isChromeExtension && this.token) {
      try {
        // Revoke the token
        await new Promise<void>((resolve) => {
          chrome.identity.removeCachedAuthToken({ token: this.token! }, () => {
            resolve();
          });
        });

        // Also revoke on Google's end
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${this.token}`).catch(() => {});
      } catch (e) {
        console.error('[Auth] Revoke error:', e);
      }
    }

    this.token = null;
    this.profile = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('tempo_onboarding_complete');
    localStorage.removeItem('google_tasks_token');
    localStorage.removeItem('ms_todo_token');
  }

  // Refresh token if expired
  async refreshToken(): Promise<boolean> {
    if (!isChromeExtension) return !!this.token;

    try {
      // Remove cached token and get a new one
      if (this.token) {
        await new Promise<void>((resolve) => {
          chrome.identity.removeCachedAuthToken({ token: this.token! }, resolve);
        });
      }

      const result = await this.signInWithGoogle();
      return result.success;
    } catch (e) {
      return false;
    }
  }

  private saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      token: this.token,
      profile: this.profile,
    }));
    if (this.token) {
      localStorage.setItem(TOKEN_KEY, this.token);
    }
  }

  // Fallback for development outside Chrome extension
  private async simulateLogin(): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    this.token = 'dev-token-' + Date.now();
    this.profile = {
      email: 'user@gmail.com',
      name: 'Tempo User',
      picture: '',
      id: 'dev-user-' + Date.now(),
    };

    this.saveState();
    return { success: true, profile: this.profile };
  }
}

export const authService = AuthService.getInstance();
export default authService;
