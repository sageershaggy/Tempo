import React from 'react';
import { Screen } from '../types';

export const TermsScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  return (
    <div className="h-full flex flex-col bg-background-dark pb-24 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 bg-background-dark/95 backdrop-blur-sm z-20 p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={() => setScreen(Screen.SETTINGS)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="font-bold text-lg">Terms of Service</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-6">
        <p className="text-xs text-muted">Last updated: February 2026</p>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">1. Acceptance of Terms</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p>By installing and using Tempo Focus, you agree to be bound by these Terms of Service. If you do not agree to these terms, please uninstall the extension.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">2. Description of Service</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p className="mb-3">Tempo Focus is a productivity extension that provides:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Pomodoro-style focus timer</li>
              <li>Task management and tracking</li>
              <li>Productivity statistics</li>
              <li>Ambient sounds for focus</li>
              <li>Pro features for subscribed users</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">3. User Accounts</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <ul className="list-disc list-inside space-y-2">
              <li>Account creation is optional but required for sync features</li>
              <li>You are responsible for maintaining account security</li>
              <li>You must provide accurate information when creating an account</li>
              <li>We reserve the right to suspend accounts that violate these terms</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">4. Pro Subscription</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-white">Billing:</span> Pro subscriptions are billed monthly or yearly</li>
              <li><span className="text-white">Cancellation:</span> You may cancel at any time; access continues until period ends</li>
              <li><span className="text-white">Refunds:</span> Refunds are provided within 7 days of purchase if requested</li>
              <li><span className="text-white">Price Changes:</span> We will notify existing subscribers 30 days before any price changes</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">5. Acceptable Use</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p className="mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Reverse engineer or modify the extension</li>
              <li>Use the service for illegal purposes</li>
              <li>Attempt to bypass subscription requirements</li>
              <li>Share license keys with unauthorized users</li>
              <li>Automate or script interactions with the extension</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">6. Intellectual Property</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p>Tempo Focus and its original content, features, and functionality are owned by Tempo Focus and are protected by international copyright, trademark, and other intellectual property laws.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">7. Limitation of Liability</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p>Tempo Focus is provided "as is" without warranty of any kind. We are not liable for any damages arising from the use or inability to use the service, including but not limited to data loss or productivity impacts.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">8. Changes to Terms</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p>We reserve the right to modify these terms at any time. Continued use of the extension after changes constitutes acceptance of the new terms. Significant changes will be communicated via the extension or email.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary">9. Contact</h3>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/5 text-sm text-muted leading-relaxed">
            <p>For questions about these Terms:</p>
            <p className="text-white mt-2">legal@tempofocus.app</p>
          </div>
        </section>

        <div className="pt-4 text-center">
          <p className="text-xs text-muted/50">Thank you for using Tempo Focus.</p>
        </div>
      </div>
    </div>
  );
};
