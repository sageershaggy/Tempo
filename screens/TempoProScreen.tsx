import React, { useState } from 'react';
import { Screen, GlobalProps } from '../types';

export const TempoProScreen: React.FC<GlobalProps> = ({ setScreen, setIsPro }) => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleActivate = () => {
      // In a real app, this would trigger In-App Purchase logic
      setIsPro(true);
      setTimeout(() => {
          setScreen(Screen.SETTINGS);
      }, 500);
  };

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

            {/* Pricing Toggle */}
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
                onClick={handleActivate}
                className="w-full py-4 bg-white text-black font-extrabold rounded-xl text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform active:scale-95 mb-6"
            >
                Start 7-Day Free Trial
            </button>
            <p className="text-center text-xs text-muted mb-8">Recurring billing. Cancel anytime.</p>

            {/* Legal Links (Crucial for Chrome Ext) */}
            <div className="border-t border-white/10 pt-6 pb-12">
                <h4 className="text-xs font-bold text-muted uppercase mb-4 text-center">Legal & Support</h4>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                    <button className="text-[10px] text-muted hover:text-white underline">Privacy Policy</button>
                    <button className="text-[10px] text-muted hover:text-white underline">Terms of Service</button>
                    <button className="text-[10px] text-muted hover:text-white underline">Support Center</button>
                    <button onClick={handleActivate} className="text-[10px] text-muted hover:text-white underline">Restore Purchase</button>
                </div>
                <p className="text-[9px] text-muted/40 text-center mt-4 max-w-xs mx-auto">
                    By subscribing, you agree to Tempo's Terms of Service and Privacy Policy. Subscriptions auto-renew unless canceled at least 24-hours before the end of the current period.
                </p>
            </div>
       </div>
    </div>
  );
};