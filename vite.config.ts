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
    } else if (process.env.BASE_PATH) {
      basePath = process.env.BASE_PATH;
    } else if (process.env.GITHUB_REPOSITORY) {
      const parts = process.env.GITHUB_REPOSITORY.split('/');
      const repo = parts[1] || '';
      if (repo && !repo.endsWith('.github.io')) {
        basePath = `/${repo}/`;
      } else {
        basePath = '/';
      }
    }

    // Ensure directory subpaths end with a slash
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
