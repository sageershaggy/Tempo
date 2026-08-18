# Tempo Focus

A Chrome extension focus timer. Start a session, work, take the break it offers you.
The countdown runs in the background, so it keeps going when the popup is closed.

---

## Using it

**The loop:** open Tempo → pick a preset → press **Start**. When the session ends you
get a notification offering a break. That's the whole product. Everything below is
optional.

| Preset | Focus / Break | Good for |
| --- | --- | --- |
| 25 / 5 | 25 min, 5 min | The classic Pomodoro. Start here. |
| 50 / 10 | 50 min, 10 min | Deep work. |
| 90 / 20 | 90 min, 20 min | A full attention cycle. |
| Custom | Your own | Anything else. |

After four focus sessions you get a longer break automatically.

### Where everything lives

The bottom bar has five tabs. Most features sit one tap deeper, which is the single
most common reason people miss them:

| Feature | How to reach it |
| --- | --- |
| Timer, presets, mini timer | **Timer** tab |
| Tasks, calendar, milestones | **Tasks** tab |
| Focus history and streaks | **Stats** tab |
| Soundscapes | **Timer** tab → sound button |
| Settings | Gear icon, top right of Timer / Stats / Profile |
| **How Tempo works (help)** | **Settings → Help & Support → How Tempo works** |
| Health reminders | **Settings → Health & Wellness** |
| Google Tasks sync | **Settings → Integrations** |
| Themes (all 27, free) | **Settings → App Theme** |
| Export your data (CSV) | **Settings → Export Data** |
| Magic Enhance (AI) | **Settings → AI Assistant** |

If you are unsure about anything in the app, open **Settings → How Tempo works** —
it answers the questions the interface itself doesn't.

### Sound options, in plain terms

- **Binaural beats** — slightly different tones in each ear. Needs headphones.
- **Solfeggio** — fixed tuning frequencies some people find calming.
- **Brown / pink / white noise** — steady hiss that masks background sound.
  Brown is deepest, white is brightest.
- **Ambience** — rain, café, fire, waves.

None of it is required. Use whatever helps, or nothing.

### Cost

Everything is free: the timer, tasks, stats, health reminders, every soundscape,
all 27 themes, Google sign-in, Google Tasks sync, and data export. There is no paid
tier and no trial.

### Your data

Tasks, session history, and your API key stay on your device. Signing in with Google
syncs settings and stats across your Chrome installations. Nothing is sent anywhere
else. **Settings → Export Data** gives you a CSV of everything.

---

## Development

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Typecheck, then build |
| `npm run icons` | Regenerate `public/icons/*_v4.png` from the SVGs |
| `npm run package` | Build, verify versions match, emit an uploadable zip |

### Loading it in Chrome

1. `npm run build`
2. `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select `dist/`

### Environment

Copy `.env.example` to `.env.local`. Nothing in it is required for the extension to
run — it only configures the OAuth fallback and the dev-only admin screen.

**No API keys are baked into the build.** Anything injected at build time is readable
by anyone who unzips the published extension, so the AI feature asks each user for
their own Gemini key at runtime (Settings → AI Assistant), stored in
`chrome.storage.local`.

### Architecture

Three runtime contexts, which is the thing to understand before changing timer code:

```
┌─────────────┐   messages   ┌──────────────────┐   messages   ┌──────────────┐
│   Popup     │ ───────────► │  Service worker  │ ───────────► │  Offscreen   │
│  (React)    │ ◄─────────── │  background.js   │ ◄─────────── │  document    │
└─────────────┘              └──────────────────┘              └──────────────┘
  UI only.                     Owns timer state.                 Owns audio.
  Dies on close.               Survives popup close.              Survives too.
```

- **`chrome.storage.local` is the source of truth for timer state.** The popup is a
  view over it, never the owner — it is destroyed the moment it loses focus.
- Long-running work belongs in the service worker via `chrome.alarms`. A
  `setInterval` in the popup stops the instant the popup closes.
- The service worker itself is evicted after ~30s idle, so **module-level variables
  are not durable**. Anything that must survive goes in `chrome.storage`
  (see `claimSessionCompletion` in `public/background.js`).
- Audio plays from the offscreen document so it continues with the popup closed.

`public/*.js` is copied verbatim into the build — it is **not** bundled or
typechecked. Keep it plain ES module JavaScript with no imports from `src`.

### Versioning

`package.json` is the single source of truth. It is injected into the app as
`__APP_VERSION__` at build time. `public/manifest.json` must be updated to match —
`npm run package` fails if the two disagree.

### Release checklist

1. Update the version in `package.json` **and** `public/manifest.json`
2. Add a `CHANGELOG.md` entry
3. `npm run verify`
4. `npm run package`
5. Load the built `dist/` unpacked and smoke-test:
   start a timer, close the popup, confirm the badge counts down and the
   completion notification arrives
6. Upload the zip to the Chrome Web Store

### Google OAuth

Sign-in uses `chrome.identity.getAuthToken` with the client id in
`public/manifest.json`. Unpacked builds get a **random extension id**, which will not
match a registered OAuth client — that is why `redirect_uri_mismatch` appears in
development.

Two ways to resolve it:

- **Preferred:** add the packed extension's public `key` to `public/manifest.json` so
  dev and store builds share one id.
- **Fallback:** set `VITE_GOOGLE_OAUTH_CLIENT_ID` and
  `VITE_ENABLE_WEB_AUTH_FALLBACK=true` in `.env.local`, and register
  `https://<YOUR_EXTENSION_ID>.chromiumapp.org/` as a redirect URI on that client.

Relevant code: `services/authService.ts`, `services/googleTasks.ts`.

### "Google hasn't verified this app"

That interstitial appears when an unverified OAuth consent screen requests a
**sensitive** scope. Tempo's scopes split like this:

| Scope | Class | Needs verification? |
| --- | --- | --- |
| `userinfo.email` | Non-sensitive | No |
| `userinfo.profile` | Non-sensitive | No |
| `.../auth/tasks` | **Sensitive** | Yes |

Sign-in used to request all three at once, so **every first-time user hit the warning**
before they could do anything. Sign-in now requests only the two identity scopes
(`SIGN_IN_SCOPES` in `services/authService.ts`); the `tasks` scope is requested lazily
by `services/googleTasks.ts`, only when someone connects Google Tasks.

To clear the warning completely, in **Google Cloud Console → APIs & Services → OAuth
consent screen**:

1. Set **User type** to *External*.
2. Fill in app name, support email, developer contact, and an app logo.
3. Add your **Privacy Policy** and **Terms of Service** URLs (hosted publicly —
   the in-extension screens do not count).
4. Set **Publishing status** to **In production**.
   With only the two non-sensitive scopes, this alone removes the warning and needs
   no review.
5. Only if you want Google Tasks sync available to everyone: submit for
   **OAuth verification** and justify the `tasks` scope. Review typically takes a few
   days to a few weeks. Until it passes, Google Tasks stays limited to accounts listed
   under **Test users** — the rest of the extension is unaffected.

While in *Testing*, add any account that needs sign-in under **Audience → Test users**.
