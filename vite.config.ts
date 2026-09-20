import path from 'path';
import { readFileSync, realpathSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Resolve through Windows junctions/symlinks so Vite and Rollup agree on the
// project root. Building from D:\Github\Tempo (junction → E:\AI\Projects\Tempo)
// otherwise emits an absolute E: HTML path and fails.
const root = realpathSync(path.resolve(__dirname));
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'));

export default defineConfig(() => {
    return {
      root,
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
          '@': root,
        },
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
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
