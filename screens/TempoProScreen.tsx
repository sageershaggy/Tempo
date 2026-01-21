import React, { useState, useEffect } from 'react';
import { Screen, GlobalProps } from '../types';
import { validateLicenseKey, activatePro, getProStatus, getAdminConfig } from '../services/storageService';

export const TempoProScreen: React.FC<GlobalProps> = ({ setScreen, setIsPro, isPro }) => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState({ monthly: '', yearly: '' });

  // Load payment links from admin config
  useEffect(() => {
    getAdminConfig().then(config => {
      setPaymentLinks({
        monthly: config.stripeMonthlyLink || '',
        yearly: config.stripeYearlyLink || ''
      });
    });
  }, []);

  const handlePaymentClick = () => {
    const link = plan === 'yearly' ? paymentLinks.yearly : paymentLinks.monthly;
    if (link) {
      window.open(link, '_blank');
      // Show license input after redirect
      setTimeout(() => setShowLicenseInput(true), 1000);
    } else {
      // Fallback: show license input directly if no payment link configured
      setShowLicenseInput(true);
    }
  };

  const handleLicenseActivation = async () => {
    setLicenseError('');
    const trimmedKey = licenseKey.trim().toUpperCase();

    if (!trimmedKey) {
      setLicenseError('Please enter a license key');
      return;
    }

    const validation = validateLicenseKey(trimmedKey);
    if (!validation.valid) {
      setLicenseError('Invalid license key format. Expected: TEMPO-XXXX-XXXX-XXXX-M or TEMPO-XXXX-XXXX-XXXX-Y');
      return;
    }

    setIsActivating(true);

    try {
      await activatePro(trimmedKey, validation.plan!);
      setIsPro(true);
      setActivationSuccess(true);

      setTimeout(() => {
        setScreen(Screen.SETTINGS);
      }, 2000);
    } catch (e) {
      setLicenseError('Failed to activate license. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleRestorePurchase = async () => {
    // Check stored pro status
    const status = await getProStatus();
    if (status.isPro) {
      setIsPro(true);
      setActivationSuccess(true);
      setTimeout(() => setScreen(Screen.SETTINGS), 2000);
    } else {
      setShowLicenseInput(true);
    }
  };

  // Success animation
  if (activationSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background-dark px-6 animate-fade-in">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-green-400">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to Pro!</h2>
        <p className="text-muted text-center">Unlocking all premium features...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-dark pb-6 overflow-y-auto no-scrollbar relative">
      {/* Close Button */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-white/10">
          <span className="material-symbols-outlined text-white">close</span>
        </button>
      </div>

      {/* Hero Image / Gradient */}
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary to-background-dark"></div>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #FF6B6B 0%, transparent 50%)' }}></div>
        <div className="absolute bottom-0 left-0 w-full p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-yellow-400 fill-current">diamond</span>
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Tempo Pro</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Unlock your full <br/>potential.</h1>
        </div>
      </div>

      <div className="px-6 -mt-4 relative z-10">
        {/* Features */}
        <div className="space-y-4 mb-8">
          {[
            { icon: 'palette', title: 'Premium Themes', desc: 'Customize with Midnight, Forest & more' },
            { icon: 'graphic_eq', title: 'Premium Soundscapes', desc: 'Access 50+ binaural & lo-fi tracks' },
            { icon: 'insights', title: 'Advanced Analytics', desc: 'Export data & view yearly trends' },
            { icon: 'cloud_sync', title: 'Unlimited Sync', desc: 'Sync across all devices instantly' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <div>
                <p className="font-bold text-sm">{f.title}</p>
                <p className="text-xs text-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* License Key Input (shown after payment or restore) */}
        {showLicenseInput && (
          <div className="bg-surface-dark rounded-xl p-4 mb-6 border border-white/10 animate-slide-up">
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">key</span>
              Enter License Key
            </h3>
            <p className="text-xs text-muted mb-4">
              Enter your license key from your purchase confirmation email.
            </p>
            <input
              type="text"
              placeholder="TEMPO-XXXX-XXXX-XXXX-Y"
              value={licenseKey}
              onChange={(e) => {
                setLicenseKey(e.target.value.toUpperCase());
                setLicenseError('');
              }}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono tracking-wider focus:border-primary outline-none mb-3"
              maxLength={24}
            />
            {licenseError && (
              <p className="text-red-400 text-xs mb-3">{licenseError}</p>
            )}
            <button
              onClick={handleLicenseActivation}
              disabled={isActivating}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {isActivating ? 'Activating...' : 'Activate License'}
            </button>
          </div>
        )}

        {/* Pricing Toggle (hidden when license input shown) */}
        {!showLicenseInput && (
          <>
            <div className="bg-surface-light p-1 rounded-xl flex mb-6">
              <button
                onClick={() => setPlan('monthly')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${plan === 'monthly' ? 'bg-surface-dark text-white shadow-md' : 'text-muted'}`}
              >
                Monthly
                <span className="block text-[10px] font-normal opacity-70">$1.00/mo</span>
              </button>
              <button
                onClick={() => setPlan('yearly')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all relative ${plan === 'yearly' ? 'bg-primary text-white shadow-md' : 'text-muted'}`}
              >
                <span className="absolute -top-2 right-2 bg-secondary text-[8px] px-1.5 py-0.5 rounded text-white border border-background-dark">SAVE 20%</span>
                Yearly
                <span className="block text-[10px] font-normal opacity-70">$10.00/yr</span>
              </button>
            </div>

            <button
              onClick={handlePaymentClick}
              className="w-full py-4 bg-white text-black font-extrabold rounded-xl text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform active:scale-95 mb-4"
            >
              {paymentLinks.monthly || paymentLinks.yearly ? 'Subscribe Now' : 'Enter License Key'}
            </button>

            {/* Already have a key? */}
            <button
              onClick={() => setShowLicenseInput(true)}
              className="w-full py-3 text-primary text-sm font-bold hover:underline mb-6"
            >
              Already have a license key?
            </button>
          </>
        )}

        <p className="text-center text-xs text-muted mb-8">
          {showLicenseInput ? 'Check your email for your license key after purchase.' : 'Recurring billing. Cancel anytime.'}
        </p>

        {/* Legal Links (Crucial for Chrome Ext) */}
        <div className="border-t border-white/10 pt-6 pb-12">
          <h4 className="text-xs font-bold text-muted uppercase mb-4 text-center">Legal & Support</h4>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <button className="text-[10px] text-muted hover:text-white underline">Privacy Policy</button>
            <button className="text-[10px] text-muted hover:text-white underline">Terms of Service</button>
            <button className="text-[10px] text-muted hover:text-white underline">Support Center</button>
            <button onClick={handleRestorePurchase} className="text-[10px] text-muted hover:text-white underline">Restore Purchase</button>
          </div>
          <p className="text-[9px] text-muted/40 text-center mt-4 max-w-xs mx-auto">
            By subscribing, you agree to Tempo's Terms of Service and Privacy Policy. Subscriptions auto-renew unless canceled at least 24-hours before the end of the current period.
          </p>
        </div>
      </div>
    </div>
  );
};
