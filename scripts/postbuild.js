import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const publicDir = path.join(rootDir, 'public');

console.log('Running Explore AI Assistant post-build processing...');

// 1. Ensure dist/.nojekyll exists
fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');

// 2. Ensure dist/404.html exists
const public404 = path.join(publicDir, '404.html');
const dist404 = path.join(distDir, '404.html');
if (fs.existsSync(public404)) {
  fs.copyFileSync(public404, dist404);
}

// 3. In dist/index.html, mark as compiled so it never redirects
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(distIndex)) {
  let content = fs.readFileSync(distIndex, 'utf-8');
  content = content.replace(
    'window.__IS_DEV_SOURCE__ = true;',
    'window.__IS_DEV_SOURCE__ = false;'
  );
  fs.writeFileSync(distIndex, content, 'utf-8');
}

// 4. Mirror all dist/ files to docs/ for automatic GitHub Pages main/docs hosting
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(distDir)) {
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
  }
  copyDirSync(distDir, docsDir);
  fs.writeFileSync(path.join(docsDir, '.nojekyll'), '', 'utf-8');
  console.log('Successfully mirrored dist/ to docs/ for instant GitHub Pages deployment.');
}

console.log('Post-build finished successfully.');
