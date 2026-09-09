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

  // 5. Also copy assets to root /assets/ for compatibility with root-level GitHub Pages deployments
  const rootAssetsDir = path.join(rootDir, 'assets');
  if (fs.existsSync(rootAssetsDir)) {
    fs.rmSync(rootAssetsDir, { recursive: true, force: true });
  }
  copyDirSync(path.join(distDir, 'assets'), rootAssetsDir);

  // 6. Provide universal entry bridge (app-entry.js and app-style.css) and backwards-compatible index-MRXryAcI.js
  try {
    const assetFiles = fs.readdirSync(path.join(distDir, 'assets'));
    const mainJs = assetFiles.find(f => f.startsWith('index-') && f.endsWith('.js') && f !== 'index-MRXryAcI.js');
    const mainCss = assetFiles.find(f => f.startsWith('index-') && f.endsWith('.css'));

    if (mainJs) {
      const entryContent = `import './${mainJs}';\n`;
      fs.writeFileSync(path.join(distDir, 'assets', 'app-entry.js'), entryContent, 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'assets', 'app-entry.js'), entryContent, 'utf-8');
      fs.writeFileSync(path.join(rootAssetsDir, 'app-entry.js'), entryContent, 'utf-8');

      // Compatibility bridge for any cached clients referencing index-MRXryAcI.js
      fs.writeFileSync(path.join(distDir, 'assets', 'index-MRXryAcI.js'), entryContent, 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'assets', 'index-MRXryAcI.js'), entryContent, 'utf-8');
      fs.writeFileSync(path.join(rootAssetsDir, 'index-MRXryAcI.js'), entryContent, 'utf-8');
      console.log(`Created universal entry bridge app-entry.js -> ${mainJs}`);
    }

    if (mainCss) {
      const cssContent = `@import './${mainCss}';\n`;
      fs.writeFileSync(path.join(distDir, 'assets', 'app-style.css'), cssContent, 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'assets', 'app-style.css'), cssContent, 'utf-8');
      fs.writeFileSync(path.join(rootAssetsDir, 'app-style.css'), cssContent, 'utf-8');
      console.log(`Created universal style bridge app-style.css -> ${mainCss}`);
    }
  } catch (e) {
    console.warn('Bridge creation skipped:', e);
  }
}

console.log('Post-build finished successfully.');
