import React from 'react';
import { Screen } from '../types';
import { authService } from '../services/authService';

export const LoginScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.signInWithGoogle();

      if (result.success) {
        // Save user profile to localStorage for other screens
        if (result.profile) {
          localStorage.setItem('tempo_user_profile', JSON.stringify({
            displayName: result.profile.name,
            email: result.profile.email,
            picture: result.profile.picture,
          }));
        }
        localStorage.setItem('tempo_onboarding_complete', 'true');
        localStorage.setItem('tempo_login_method', 'google');
        setScreen(Screen.ONBOARDING);
      } else {
        setError(result.error || 'Sign-in failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem('tempo_onboarding_complete', 'true');
    localStorage.setItem('tempo_login_method', 'guest');
    setScreen(Screen.ONBOARDING);
  };

  return (
    <div className="h-[600px] w-full flex flex-col items-center justify-center bg-background-dark px-6 relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

      <div className="w-full max-w-sm bg-surface-dark border border-white/5 p-8 rounded-2xl shadow-2xl relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            <img src="./icons/icon128_v4.png" alt="Tempo Focus" className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Tempo Focus</h1>
          <p className="text-muted text-sm text-center">Sync your focus across Chrome and mobile.</p>
        </div>

        <div className="space-y-3">
          {/* Google SSO Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-white text-black rounded-lg font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
            ) : (
              <>
                {/* Google Icon SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Guest Login - Made prominent for easy access */}
          <div className="pt-2">
            <button
              onClick={handleGuestLogin}
              className="w-full h-12 bg-white/10 border border-white/20 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">person</span>
              Continue as Guest
            </button>
          </div>

          {/* Guest Login */}

        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-[10px] text-muted">
            By continuing, you agree to our <span className="underline cursor-pointer">Terms</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
