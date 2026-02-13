# Tempo Focus Chrome Extension

## Local Development
Prerequisites: Node.js 18+

1. Install dependencies: `npm install`
2. Create `.env.local` from `.env.example`
3. Set `VITE_GEMINI_API_KEY`
4. Run: `npm run dev`

## Production Build
1. Build: `npm run build`
2. Load `dist/` as unpacked extension in Chrome for QA
3. Package and upload to Chrome Web Store

## Google OAuth Setup (SSO)
If you see `Error 400: redirect_uri_mismatch`, configure OAuth exactly like this.

1. Open Google Cloud Console, then `APIs & Services -> Credentials`.
2. Configure the client used in `public/manifest.json` under `oauth2.client_id`.
3. If you use web-auth fallback, set `VITE_GOOGLE_OAUTH_CLIENT_ID` in `.env.local`.
4. In that fallback OAuth client, add this redirect URI:
   `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`
5. Ensure OAuth consent screen is configured and published (or your account is added as a test user).

Example redirect URI (from extension id `ifegjpnhaflnjdjbdijeaghapkfpjbbg`):
`https://ifegjpnhaflnjdjbdijeaghapkfpjbbg.chromiumapp.org/`

## Notes
- SSO code paths are in `services/authService.ts` and `services/googleTasks.ts`.
- YouTube + focus audio persistence are handled by `public/background.js` and `public/offscreen.js`.
