import React from 'react';
declare var chrome: any;
import { Screen } from '../types';
import { authService } from '../services/authService';
import { getProStatus } from '../services/storageService';
import { configManager } from '../config';

export const LoginScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPro, setIsPro] = React.useState(false);
  const [showProUpsell, setShowProUpsell] = React.useState(false);

  React.useEffect(() => {
    getProStatus().then(s => setIsPro(s.isPro));
  }, []);

  const handleLoginResult = (result: { success: boolean; profile?: any; error?: string }) => {
    if (result.success) {
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
      // Don't surface raw OAuth errors — silently fall back
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isPro) {
      setShowProUpsell(true);
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      handleLoginResult(result);
    } catch (err: any) {
      console.error('Login failed:', err);
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
          <p className="text-muted text-sm text-center">Your focused productivity companion.</p>
        </div>

        {showProUpsell ? (
          /* Premium upsell card */
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-yellow-400 text-xl">workspace_premium</span>
              <span className="text-sm font-bold text-yellow-300">Tempo Pro</span>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed">
              Google Sign-in unlocks cross-device sync, Google Tasks, all themes, and cloud backup.
            </p>
            <div className="space-y-2 pt-1">
              <a
                href={configManager.getConfig().pricing.paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#0070BA] text-white flex items-center justify-center gap-2 hover:bg-[#005ea6] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.819l-1.35 8.568h4.106a.641.641 0 0 0 .634-.55l.025-.13.49-3.098.031-.17a.641.641 0 0 1 .633-.55h.398c2.587 0 4.61-.543 5.655-2.114.478-.718.733-1.587.8-2.614.044-.683-.034-1.27-.219-1.737z"/>
                </svg>
                Upgrade with PayPal
              </a>
              <p className="text-[10px] text-white/40 leading-relaxed">
                Account activated within 24 hours of payment.
              </p>
              <button
                onClick={() => setShowProUpsell(false)}
                className="w-full py-2 rounded-lg text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Google Sign-in — Pro */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="relative w-full h-12 bg-white text-black rounded-lg font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
              {/* Pro badge */}
              <span className="absolute -top-2 -right-2 flex items-center gap-0.5 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                <span className="material-symbols-outlined text-[9px]">star</span>
                PRO
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-[10px] text-muted">or</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Guest Login — Free */}
            <button
              onClick={handleGuestLogin}
              className="w-full h-12 bg-white/10 border border-white/20 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">person</span>
              Continue as Guest
            </button>

            <p className="text-[10px] text-muted text-center pt-1">
              Guest mode stores data locally on this device.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-[10px] text-muted">
            By continuing, you agree to our{' '}
            <span className="underline cursor-pointer">Terms</span> and{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
