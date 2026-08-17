/// <reference types="vite/client" />

/** Injected by Vite at build time from package.json — see vite.config.ts. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Public OAuth client id used by the launchWebAuthFlow fallback. Not a secret. */
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  /** Set to 'true' to enable the launchWebAuthFlow fallback in unpacked builds. */
  readonly VITE_ENABLE_WEB_AUTH_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
