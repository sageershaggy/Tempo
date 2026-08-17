import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig(() => {
    return {
      server: {
        // Bind to localhost only. '0.0.0.0' exposed the dev server, including
        // any local state, to every device on the network.
        port: 3000,
      },
      plugins: [react(), tailwindcss()],
      define: {
        // Single source of truth for the version shown in-app (see package.json).
        // NOTE: no API keys are injected here. Secrets inlined at build time end
        // up readable in the shipped bundle — the Gemini key is supplied by the
        // user at runtime instead. See services/geminiService.ts.
        __APP_VERSION__: JSON.stringify(pkg.version),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name].[ext]',
          },
        },
      },
      base: './',
    };
});
