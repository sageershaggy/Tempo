# Changelog

## [1.1.0] - 2026-08-17

Security, reliability, and a serious pass at making the extension explain itself.

### Security
- **API keys are no longer bundled.** The build previously inlined a Gemini key into
  `dist/`, handing the developer's billed credentials to every installer. Magic Enhance
  now uses a key each user supplies in Settings, stored in `chrome.storage.local`.
- **Admin panel removed from production builds.** It had no server behind it and three
  independent bypasses, including a default password published in a source comment.
- **Admin session tokens are now signed.** A hand-written `{expiresAt}` value in
  localStorage used to unlock the panel outright.
- **OAuth access tokens are no longer written to localStorage.** Chrome's own token
  cache is used instead; only the non-sensitive profile is stored.
- **`?screen=` no longer bypasses login.** Deep links were resolved before the login and
  onboarding gates, so `?screen=admin` skipped both.
- Pro status with no expiry date no longer grants Pro forever.
- Removed the unused `checkout.stripe.com` host permission (a Web Store rejection risk).
- Removed a development backdoor that faked a working Google Tasks connection and served
  invented tasks.

### Fixed
- **Sessions that ended while Chrome was idle are no longer discarded.** If the service
  worker was asleep at expiry, the session was silently dropped — no stats, no
  notification. It is now credited on wake.
- **Session completion is idempotent.** Two independent code paths could each open an
  alarm tab, fire a notification, and count the session, because the guard was a module
  variable that reset whenever Chrome evicted the service worker.
- **Health reminders now actually fire.** They ran on `setInterval` inside the popup
  with a 30-minute default, so they only ticked while the popup happened to be open —
  in practice, never. They now run on `chrome.alarms` in the service worker.
- **Notification buttons work.** "Snooze 15m" and "Mark Complete" parsed the task id as
  `notificationId.split('-')[1]`, which always returned the literal string `"task"`, so
  both silently did nothing.
- **Sign Out signs out.** It only changed screens; the session survived and reopening
  the popup dropped you straight back in.
- **Onboarding is marked complete when you finish it**, not at login. Closing the popup
  mid-tour previously meant never seeing it again.
- Cross-device stats sync no longer breaks after ~a year: `weeklyData` grew unbounded
  past `chrome.storage.sync`'s 8KB per-item quota, and every write then failed silently.
- Sign-in failures show the reason instead of just stopping the spinner.

### Changed
- **Google sign-in is free.** It was gated behind `isPro`, which is false for every new
  user — so the primary button on the very first screen never signed anyone in, it showed
  a PayPal upsell. Pro now gates only the sync features themselves.
- **New "How Tempo works" help screen** covering presets, soundscape jargon, what syncs,
  the mini timer, and free vs Pro — reachable from Settings, with a "replay the tour"
  option. The three Help & Support buttons all used to open the same feedback form.
- **Magic Enhance works**; it previously shipped as a permanently disabled "Coming Soon"
  button.
- Terms and Privacy Policy on the login screen are real links; they were unclickable
  underlined text.
- Version now comes from `package.json` alone. Settings displayed v1.0.2 while the
  extension shipped as 1.0.5.

### Housekeeping
- Four overlapping icon scripts consolidated into `scripts/generate-icons.mjs`.
- Added `npm run typecheck`, `verify`, and `package` (which refuses to build a zip when
  `package.json` and the manifest disagree on the version).
- Secrets, `dist/`, and release archives are no longer tracked in git.

## [1.0.2] - 2026-02-14

### Authentic Ambience Audio Upgrade
- **New Feature:** Added real recordings for all ambience tracks (Rain, Coffee Shop, Forest Stream, Ocean Waves, Fire, Crickets, Wind Chimes).
- **Bug Fix:** Fixed playback quality issues for Crackling Fire, Ocean Waves, and Night Crickets.
- **Improvement:** Improved sound switching so only the selected track plays.
- **Stability:** Improved reliability of audio startup/fallback handling.

### Authentication
- **Fix:** Updated Google Sign-In Client ID to fix "Access Blocked" errors on Chrome Web Store.
- **Verification:** Version 1.0.2 submitted to Chrome Web Store with new credentials.

## [1.0.1]
- Initial Release
