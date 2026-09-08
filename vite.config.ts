import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Permanently prevent blank white screens on GitHub Pages:
  // Dynamically resolve repository subpath if running in GitHub Actions,
  // or use explicit VITE_BASE_PATH / BASE_PATH, or fallback safely to relative './'.
  let basePath = process.env.VITE_BASE_PATH || process.env.BASE_PATH || '';
  if (!basePath && process.env.GITHUB_REPOSITORY) {
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    const repo = parts[1] || '';
    if (repo && !repo.endsWith('.github.io')) {
      basePath = `/${repo}/`;
    } else {
      basePath = '/';
    }
  }
  if (!basePath) {
    basePath = './';
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
