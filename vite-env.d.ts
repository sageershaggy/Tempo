/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_ADMIN_PASSWORD_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
