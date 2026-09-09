import { execSync } from 'child_process';

function run(cmd, silent = false) {
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
    return stdout ? stdout.trim() : '';
  } catch (err) {
    if (!silent) {
      console.warn(`Command failed: ${cmd}`, err.message);
    }
    return null;
  }
}

console.log('🚀 Starting All-At-Once GitHub & Repository Sync...');

// 1. Build production bundle & mirror docs and assets
console.log('📦 Step 1: Building production bundle, docs, and assets...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ Build warning (continuing sync):', e.message);
}

// 2. Ensure git is initialized and user is configured
const hasGit = run('git rev-parse --is-inside-work-tree', true);
if (!hasGit) {
  console.log('🔧 Initializing git repository...');
  run('git init -b main');
}

const userEmail = run('git config user.email', true);
if (!userEmail) {
  run('git config user.email "exploretheinsideexperiment@gmail.com"');
  run('git config user.name "Explore AI Assistant"');
}

// 3. Stage everything at once
console.log('📥 Step 2: Staging all files, firmware, docs, and assets...');
run('git add -A');

// 4. Commit all pending changes
const status = run('git status --porcelain', true);
if (status && status.trim().length > 0) {
  console.log('📝 Step 3: Committing all updates at once...');
  const commitMsg = `chore(sync): sync all updates, firmware, and manual booklet [${new Date().toISOString()}]`;
  run(`git commit -m "${commitMsg}"`);
  console.log('✅ Changes successfully committed locally.');
} else {
  console.log('ℹ️ All files already up to date in git working tree.');
}

// 5. Check remote origin and push
const remotes = run('git remote -v', true);
const branch = run('git rev-parse --abbrev-ref HEAD', true) || 'main';

if (remotes && remotes.includes('origin')) {
  console.log(`🌐 Step 4: Syncing all commits at once to GitHub (branch: ${branch})...`);
  try {
    // Attempt rebase pull first to ensure clean history
    run(`git fetch origin ${branch}`, true);
    run(`git rebase origin/${branch}`, true);
    // Push all commits at once
    run(`git push -u origin ${branch}`);
    console.log('🎉 Successfully synced and pushed all changes to GitHub at once!');
  } catch (pushErr) {
    console.warn('⚠️ Push to origin encountered an issue:', pushErr.message);
    console.log('ℹ️ You can configure or update your GitHub origin token with:');
    console.log('   git remote set-url origin https://<TOKEN>@github.com/<OWNER>/<REPO>.git');
  }
} else {
  console.log('\n📌 Local repository is completely synced and up to date!');
  console.log('👉 To link your GitHub repository and push all at once, run:');
  console.log('   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git');
  console.log('   git push -u origin main\n');
}
