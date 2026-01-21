import React from 'react';
import { Screen } from '../types';

export const PrivacyPolicyScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="font-bold text-lg">Privacy Policy</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-6">
        <p className="text-xs text-muted">Last updated: January 2026</p>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">1. Information We Collect</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p className="mb-3">Tempo Focus collects minimal data to provide our service:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-white">Usage Data:</span> Timer sessions, tasks created, and productivity statistics stored locally on your device</li>
              <li><span className="text-white">Account Info:</span> Email address if you sign in with Google (optional)</li>
              <li><span className="text-white">Preferences:</span> Your settings and customizations stored in Chrome sync storage</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">2. How We Use Your Data</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain the service</li>
              <li>To sync your data across devices (if enabled)</li>
              <li>To process payments for Pro subscriptions</li>
              <li>To improve our product based on anonymous usage patterns</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">3. Data Storage</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p className="mb-3">Your data is stored:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-white">Locally:</span> On your device using Chrome's storage API</li>
              <li><span className="text-white">Chrome Sync:</span> Encrypted and synced across your Chrome browsers (if signed in)</li>
              <li><span className="text-white">We do NOT:</span> Store your data on external servers or sell your information to third parties</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">4. Third-Party Services</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-white">Google Sign-In:</span> For optional account authentication</li>
              <li><span className="text-white">Stripe:</span> For secure payment processing (Pro subscriptions)</li>
              <li><span className="text-white">Google AI:</span> For optional AI-powered task suggestions (data is not stored)</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">5. Your Rights</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Access your data (via Export feature in Settings)</li>
              <li>Delete your data (uninstall the extension)</li>
              <li>Opt-out of Chrome sync (use local storage only)</li>
              <li>Request data deletion by contacting us</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">6. Contact Us</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p>For any privacy-related questions or concerns:</p>
            <p className="text-white mt-2">privacy@tempofocus.app</p>
          </div>
        </section>

        <div className="pt-4 text-center">
          <p className="text-xs text-muted/50">Tempo Focus - Your productivity, your data.</p>
        </div>
      </div>
    </div>
  );
};
