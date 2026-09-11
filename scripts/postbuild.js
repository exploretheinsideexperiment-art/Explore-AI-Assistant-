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

  // 6. Provide universal entry bridge (app-entry.js and app-style.css) and backwards-compatible bridges for cached URLs
  try {
    const distHtml = fs.readFileSync(distIndex, 'utf-8');
    const jsMatch = distHtml.match(/src=["']\.\/assets\/(index-[^"']+\.js)["']/);
    const cssMatch = distHtml.match(/href=["']\.\/assets\/(index-[^"']+\.css)["']/);

    const assetFiles = fs.readdirSync(path.join(distDir, 'assets'));
    const mainJs = (jsMatch && jsMatch[1]) || assetFiles.find(f => f.startsWith('index-') && f.endsWith('.js') && !f.includes('MRXryAcI') && !f.includes('entry'));
    const mainCss = (cssMatch && cssMatch[1]) || assetFiles.find(f => f.startsWith('index-') && f.endsWith('.css') && !f.includes('style'));

    if (mainJs) {
      const entryContent = `import './${mainJs}';\n`;
      const bridges = [
        'app-entry.js',
        'index-MRXryAcI.js',
        'index-9e_7g_Gy.js',
        'index-DpaMBjVr.js',
        'index-NG6fe1Nt.js'
      ];

      for (const bridgeName of bridges) {
        fs.writeFileSync(path.join(distDir, 'assets', bridgeName), entryContent, 'utf-8');
        fs.writeFileSync(path.join(docsDir, 'assets', bridgeName), entryContent, 'utf-8');
        fs.writeFileSync(path.join(rootAssetsDir, bridgeName), entryContent, 'utf-8');
      }
      console.log(`Created universal entry bridge app-entry.js & compat aliases -> ${mainJs}`);
    }

    if (mainCss) {
      const cssContent = `@import './${mainCss}';\n`;
      const cssBridges = [
        'app-style.css',
        'index-MRXryAcI.css',
        'index-UqVHjenE.css'
      ];

      for (const cssBridge of cssBridges) {
        fs.writeFileSync(path.join(distDir, 'assets', cssBridge), cssContent, 'utf-8');
        fs.writeFileSync(path.join(docsDir, 'assets', cssBridge), cssContent, 'utf-8');
        fs.writeFileSync(path.join(rootAssetsDir, cssBridge), cssContent, 'utf-8');
      }
      console.log(`Created universal style bridge app-style.css -> ${mainCss}`);
    }
  } catch (e) {
    console.warn('Bridge creation skipped:', e);
  }
}

console.log('Post-build finished successfully.');
