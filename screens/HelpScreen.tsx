import React, { useState } from 'react';
import { Screen } from '../types';
import { STORAGE_KEYS } from '../config/constants';

interface HelpEntry {
  q: string;
  a: React.ReactNode;
  icon: string;
}

/**
 * In-app answers to the questions the UI itself does not explain.
 *
 * Before this screen existed, "Help & Support" offered only a feedback form —
 * so a user asking "how does this work?" got a box to type into and no answer.
 */
const ENTRIES: HelpEntry[] = [
  {
    icon: 'play_circle',
    q: 'How do I start?',
    a: (
      <>
        Pick a preset on the Timer tab and press <strong>Start</strong>. That's the whole
        loop: focus, then take the break Tempo offers you. Everything else is optional.
      </>
    ),
  },
  {
    icon: 'close_fullscreen',
    q: 'Does the timer keep running if I close this popup?',
    a: (
      <>
        Yes. The countdown lives in the background, not in this window. The badge on the
        toolbar icon shows the time left, and you'll get a notification when the session
        ends — even if the popup, or the whole browser window, is closed.
      </>
    ),
  },
  {
    icon: 'timer',
    q: 'What do 25/5, 50/10 and 90/20 mean?',
    a: (
      <>
        Minutes of focus, then minutes of break. <strong>25/5</strong> is the classic
        Pomodoro and the best place to start. <strong>50/10</strong> suits deep work.
        <strong> 90/20</strong> matches a full attention cycle. After four focus sessions
        you get a longer break automatically.
      </>
    ),
  },
  {
    icon: 'graphic_eq',
    q: 'What are Binaural, Solfeggio and noise colours?',
    a: (
      <>
        Background sound options on the Audio screen.
        <strong> Binaural beats</strong> play slightly different tones in each ear — use
        headphones. <strong>Solfeggio</strong> are fixed tuning frequencies some people
        find calming. <strong>Brown / pink / white noise</strong> are steady hiss that
        masks office and street sound; brown is the deepest, white the brightest. None of
        it is required — pick whatever helps you concentrate, or nothing at all.
      </>
    ),
  },
  {
    icon: 'water_drop',
    q: 'What are health reminders?',
    a: (
      <>
        Optional nudges to drink water, stretch, check your posture and rest your eyes.
        Turn them on in <strong>Settings → Health &amp; Wellness</strong> and set how often
        and how many times a day each one should appear.
      </>
    ),
  },
  {
    icon: 'sync',
    q: 'What syncs, and what stays on this device?',
    a: (
      <>
        Signed in with Google, your settings and stats follow you to other Chrome
        installations. Tasks, session history and your API key stay on this device.
        Without an account, everything is local — and everything still works.
      </>
    ),
  },
  {
    icon: 'auto_awesome',
    q: 'What is Magic Enhance?',
    a: (
      <>
        It rewrites a rough note ("email sarah re budget thing") into a clear task title.
        It runs on your own free Google Gemini key, which you add in
        <strong> Settings → AI Assistant</strong>. The key stays on this device and is
        only used when you press the button.
      </>
    ),
  },
  {
    icon: 'picture_in_picture',
    q: 'Can I see the timer without opening the popup?',
    a: (
      <>
        Yes — the toolbar badge always counts down. For a bigger view, open the
        <strong> mini timer</strong> from the Timer screen; it's a small always-visible
        window you can park beside your work.
      </>
    ),
  },
  {
    icon: 'workspace_premium',
    q: "What's free and what's Pro?",
    a: (
      <>
        The timer, tasks, stats, health reminders, all soundscapes and Google sign-in are
        free. Pro adds the extra colour themes and Google Tasks two-way sync. Nothing you
        rely on day to day is behind the upgrade.
      </>
    ),
  },
  {
    icon: 'download',
    q: 'How do I get my data out?',
    a: (
      <>
        <strong>Settings → Export Data</strong> downloads your stats and tasks as a CSV
        you can open in Excel or Sheets. Your data is yours, and it is never sent anywhere
        you did not ask for.
      </>
    ),
  },
];

export const HelpScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [open, setOpen] = useState<number | null>(0);

  const replayTour = () => {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    setScreen(Screen.ONBOARDING);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background-dark">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0">
        <button
          onClick={() => setScreen(Screen.SETTINGS)}
          aria-label="Back to settings"
          className="w-9 h-9 rounded-xl bg-surface-dark border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight">How Tempo works</h1>
          <p className="text-[10px] text-muted">Short answers to the common questions</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-2">
        {ENTRIES.map((entry, i) => {
          const isOpen = open === i;
          return (
            <div
              key={entry.q}
              className="bg-surface-dark rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-base">{entry.icon}</span>
                </div>
                <span className="flex-1 text-xs font-bold leading-snug">{entry.q}</span>
                <span
                  className={`material-symbols-outlined text-muted text-base transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  expand_more
                </span>
              </button>
              {isOpen && (
                <p className="px-4 pb-4 pl-15 text-[11px] text-muted leading-relaxed">{entry.a}</p>
              )}
            </div>
          );
        })}

        <button
          onClick={replayTour}
          className="w-full mt-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
        >
          <span className="material-symbols-outlined text-base">restart_alt</span>
          Replay the intro tour
        </button>
      </div>
    </div>
  );
};
