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

// Primary Client ID (in manifest.json for getAuthToken)
const MANIFEST_CLIENT_ID = '747255011734-l7k517kfa2908all500m6cmcs4iq1ugp.apps.googleusercontent.com';
// Fallback Client ID (for launchWebAuthFlow when extension ID doesn't match)
const FALLBACK_CLIENT_ID = '747255011734-08rlb67q18s1ia4r3gemjn5p4v0su5p4.apps.googleusercontent.com';

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

  // Google Sign-In via Chrome Identity API (with fallback)
  async signInWithGoogle(): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    if (!isChromeExtension) {
      // Fallback for development/non-extension context - simulate login
      return this.simulateLogin();
    }

    try {
      // Try primary method: chrome.identity.getAuthToken (uses manifest client_id)
      const token = await this.tryGetAuthToken();
      this.token = token;
    } catch (primaryError: any) {
      console.warn('[Auth] getAuthToken failed, trying launchWebAuthFlow fallback:', primaryError.message);

      // Fallback: launchWebAuthFlow with alternate client ID
      // This works regardless of extension ID
      try {
        const token = await this.tryWebAuthFlow();
        this.token = token;
      } catch (fallbackError: any) {
        console.error('[Auth] Both auth methods failed:', fallbackError);
        let errorMessage = fallbackError.message || 'Sign-in failed';
        if (errorMessage.toLowerCase().includes('bad client id')) {
          errorMessage = 'OAuth configuration error. Please contact support.';
        }
        return { success: false, error: errorMessage };
      }
    }

    try {
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
      console.error('[Auth] Profile fetch failed:', error);
      return { success: false, error: error.message || 'Failed to fetch profile' };
    }
  }

  // Primary auth: uses manifest.json client_id + extension ID
  private tryGetAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('No token received'));
        }
      });
    });
  }

  // Fallback auth: uses launchWebAuthFlow (works with any extension ID)
  private tryWebAuthFlow(): Promise<string> {
    return new Promise((resolve, reject) => {
      const redirectUrl = chrome.identity.getRedirectURL();
      const scopes = encodeURIComponent([
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/tasks'
      ].join(' '));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${FALLBACK_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${scopes}`;

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!responseUrl) {
            reject(new Error('No response from auth flow'));
            return;
          }

          // Extract access_token from URL fragment
          const url = new URL(responseUrl);
          const params = new URLSearchParams(url.hash.substring(1));
          const token = params.get('access_token');

          if (token) {
            resolve(token);
          } else {
            reject(new Error('No access token in response'));
          }
        }
      );
    });
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
