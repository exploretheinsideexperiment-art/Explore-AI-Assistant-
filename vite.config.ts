import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  // In development, always use '/' so Vite Express middleware resolves routes cleanly.
  // In production build, default to './' (relative) so all generated script and style
  // links work universally on any domain, subpath, GitHub Pages repo, or IP address.
  let basePath = command === 'serve' ? '/' : './';

  if (command === 'build') {
    if (process.env.VITE_BASE_PATH) {
      basePath = process.env.VITE_BASE_PATH;
    } else if (process.env.BASE_PATH && process.env.BASE_PATH !== '/') {
      basePath = process.env.BASE_PATH;
    }
    // Default to relative './' which works seamlessly in all GitHub Pages configurations:
    // /docs folder, root / folder, gh-pages branch, or custom domain!
    if (basePath && basePath !== './' && !basePath.endsWith('/')) {
      basePath += '/';
    }
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
