import React, { useState } from 'react';
import { Screen } from '../types';

export const AdminScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  
  // Mock Payment Link State
  const [monthlyLink, setMonthlyLink] = useState('https://stripe.com/checkout/m');
  const [yearlyLink, setYearlyLink] = useState('https://stripe.com/checkout/y');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
        setIsLoggedIn(true);
    } else {
        alert('Invalid Access');
    }
  };

  if (!isLoggedIn) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-background-dark px-6">
              <span className="material-symbols-outlined text-4xl text-muted mb-4">admin_panel_settings</span>
              <h2 className="text-xl font-bold mb-6">Site Administration</h2>
              <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
                  <input 
                    type="password" 
                    placeholder="Enter Admin Key" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                  />
                  <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl">Login</button>
              </form>
              <button onClick={() => setScreen(Screen.PROFILE)} className="mt-6 text-xs text-muted underline">Return to App</button>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-background-dark overflow-y-auto no-scrollbar">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-dark">
            <h2 className="font-bold">Tempo Admin</h2>
            <button onClick={() => setIsLoggedIn(false)} className="text-xs text-red-400 font-bold">Logout</button>
        </div>

        <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-light p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted uppercase font-bold">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400">$12,450</p>
                    <p className="text-[10px] text-muted">+14% this month</p>
                </div>
                <div className="bg-surface-light p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-muted uppercase font-bold">Active Subs</p>
                    <p className="text-2xl font-bold text-white">1,204</p>
                    <p className="text-[10px] text-muted">84% Retention</p>
                </div>
            </div>

            {/* Payment Configuration (New Request) */}
            <div className="bg-surface-light rounded-xl p-4 border border-white/5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-400">payments</span>
                    Payment Configuration
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-muted uppercase font-bold mb-1 block">Monthly Plan URL ($1/mo)</label>
                        <input 
                            type="text" 
                            value={monthlyLink}
                            onChange={(e) => setMonthlyLink(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-blue-400 font-mono focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted uppercase font-bold mb-1 block">Yearly Plan URL ($10/yr)</label>
                        <input 
                            type="text" 
                            value={yearlyLink}
                            onChange={(e) => setYearlyLink(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-blue-400 font-mono focus:border-primary outline-none"
                        />
                    </div>
                    <button className="w-full py-2 bg-primary/20 text-primary font-bold rounded-lg text-xs hover:bg-primary/30 transition-colors">
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Feature Flags */}
            <div className="bg-surface-light rounded-xl p-4 border border-white/5">
                <h3 className="font-bold mb-4">Feature Management</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Maintenance Mode</span>
                        <div className="w-10 h-6 bg-surface-dark rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full"></div></div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Free Trial Enabled</span>
                        <div className="w-10 h-6 bg-green-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                    </div>
                </div>
            </div>

            {/* Recent Payments */}
            <div>
                <h3 className="font-bold mb-4">Recent Transactions</h3>
                <div className="bg-surface-light rounded-xl overflow-hidden border border-white/5">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="p-3 border-b border-white/5 flex justify-between items-center last:border-0">
                            <div>
                                <p className="text-sm font-bold">user_{1000+i}@gmail.com</p>
                                <p className="text-[10px] text-muted">Pro Yearly</p>
                            </div>
                            <span className="text-green-400 text-sm font-bold">+$10.00</span>
                        </div>
                    ))}
                </div>
            </div>

             <button onClick={() => setScreen(Screen.PROFILE)} className="w-full py-3 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/5">Return to App</button>
        </div>
    </div>
  );
};