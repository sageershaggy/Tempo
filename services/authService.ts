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
// Optional Web OAuth client ID for launchWebAuthFlow fallback.
const WEB_AUTH_FLOW_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
const HAS_WEB_AUTH_FLOW_CLIENT = WEB_AUTH_FLOW_CLIENT_ID.length > 0;
const AUTH_FLOW_TIMEOUT_MS = 120000;

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

    let primaryFailureMessage = '';
    try {
      // Try primary method: chrome.identity.getAuthToken (uses manifest client_id)
      const token = await this.tryGetAuthToken();
      this.token = token;
    } catch (primaryError: any) {
      primaryFailureMessage = this.formatAuthError(primaryError);
      console.warn('[Auth] getAuthToken failed, trying launchWebAuthFlow fallback:', primaryFailureMessage);

      if (primaryFailureMessage === 'Google sign-in was canceled or denied.') {
        return { success: false, error: primaryFailureMessage };
      }

      if (!HAS_WEB_AUTH_FLOW_CLIENT) {
        const redirectUrl = chrome.identity?.getRedirectURL?.() || 'https://<extension-id>.chromiumapp.org/';
        return {
          success: false,
          error: `Google sign-in failed in extension auth. Configure VITE_GOOGLE_OAUTH_CLIENT_ID and add ${redirectUrl} to Authorized redirect URIs.`,
        };
      }

      // Fallback: launchWebAuthFlow with OAuth client ID + Chrome redirect URL
      try {
        const token = await this.tryWebAuthFlow();
        this.token = token;
      } catch (fallbackError: any) {
        const fallbackFailureMessage = this.formatAuthError(fallbackError);
        console.error('[Auth] Both auth methods failed:', {
          primaryError: primaryFailureMessage,
          fallbackError: fallbackFailureMessage,
        });
        return { success: false, error: fallbackFailureMessage || primaryFailureMessage || 'Sign-in failed' };
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

  // Fallback auth: uses launchWebAuthFlow
  private tryWebAuthFlow(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!HAS_WEB_AUTH_FLOW_CLIENT) {
        reject(new Error('Missing VITE_GOOGLE_OAUTH_CLIENT_ID for web auth fallback.'));
        return;
      }

      const redirectUrl = chrome.identity.getRedirectURL();
      const scopes = encodeURIComponent([
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/tasks'
      ].join(' '));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(WEB_AUTH_FLOW_CLIENT_ID)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${scopes}&prompt=consent&include_granted_scopes=true`;
      const timeoutId = setTimeout(() => {
        reject(new Error('Google sign-in timed out. Please try again.'));
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
            reject(new Error('No response from auth flow'));
            return;
          }

          // Extract access_token from URL fragment
          const url = new URL(responseUrl);
          const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.substring(1) : url.hash);
          const token = hashParams.get('access_token') || url.searchParams.get('access_token');

          if (token) {
            resolve(token);
          } else {
            const oauthError = hashParams.get('error') || url.searchParams.get('error');
            if (oauthError) {
              reject(new Error(`Google OAuth error: ${oauthError}`));
            } else {
              reject(new Error('No access token in response'));
            }
          }
        }
      );
    });
  }

  private formatAuthError(error: any): string {
    const message = (error?.message || String(error) || 'Sign-in failed').trim();
    const lower = message.toLowerCase();
    const webClientLabel = WEB_AUTH_FLOW_CLIENT_ID || '<missing VITE_GOOGLE_OAUTH_CLIENT_ID>';

    if (lower.includes('redirect_uri_mismatch')) {
      const redirectUrl = chrome.identity?.getRedirectURL?.() || 'https://<extension-id>.chromiumapp.org/';
      return `Google OAuth redirect_uri mismatch. Add ${redirectUrl} to authorized redirect URIs for client ${webClientLabel}.`;
    }

    if (lower.includes('bad client id') || lower.includes('invalid_client')) {
      return `Google OAuth client ID is invalid or misconfigured (client: ${webClientLabel}).`;
    }

    if (lower.includes('access_denied')) {
      return 'Google sign-in was canceled or denied.';
    }

    return message;
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
