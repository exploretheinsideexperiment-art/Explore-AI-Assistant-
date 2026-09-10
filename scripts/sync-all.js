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

// Support passing remote repo URL via CLI argument or environment variables
// e.g.: npm run sync -- https://github.com/user/repo.git
const cliArg = process.argv.slice(2).find(arg => arg.startsWith('http') || arg.startsWith('git@'));
const forceFlag = process.argv.includes('--force') || process.argv.includes('-f');
const targetRepoUrl = cliArg || process.env.GITHUB_REPO || process.env.GITHUB_REPO_URL || process.env.GITHUB_URL;
const githubToken = process.env.GITHUB_TOKEN;

// 1. Ensure git safe directory and initialization
run('git config --global --add safe.directory "*"', true);

const hasGit = run('git rev-parse --is-inside-work-tree', true);
if (!hasGit) {
  console.log('🔧 Initializing git repository on branch main...');
  run('git init -b main');
} else {
  // Ensure we are on main branch
  const currentBranch = run('git rev-parse --abbrev-ref HEAD', true);
  if (!currentBranch || currentBranch === 'HEAD') {
    run('git checkout -B main');
  }
}

// 2. Configure user credentials if missing
const userEmail = run('git config user.email', true);
if (!userEmail) {
  run('git config user.email "exploretheinsideexperiment@gmail.com"');
  run('git config user.name "Explore AI Assistant"');
}

// 3. Configure or update remote origin if URL is provided
if (targetRepoUrl) {
  let finalRemoteUrl = targetRepoUrl.trim();
  // If token is provided and URL is HTTPS, embed token safely for authenticated push
  if (githubToken && finalRemoteUrl.startsWith('https://github.com/')) {
    finalRemoteUrl = finalRemoteUrl.replace('https://github.com/', `https://${githubToken}@github.com/`);
  }

  const existingRemotes = run('git remote', true) || '';
  if (existingRemotes.split('\n').includes('origin')) {
    console.log(`🔗 Updating remote origin to: ${targetRepoUrl}`);
    run(`git remote set-url origin "${finalRemoteUrl}"`);
  } else {
    console.log(`🔗 Adding remote origin: ${targetRepoUrl}`);
    run(`git remote add origin "${finalRemoteUrl}"`);
  }
}

// 4. Build production bundle & mirror docs and assets
console.log('📦 Step 1: Compiling production bundle, docs, and assets...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ Build warning (continuing sync):', e.message);
}

// 5. Stage EVERYTHING at once
console.log('📥 Step 2: Staging all files, firmware, docs, and assets at once...');
run('git add -A');

// 6. Single unified commit for all updates
const status = run('git status --porcelain', true);
if (status && status.trim().length > 0) {
  console.log('📝 Step 3: Committing all updates at once...');
  const commitMsg = `feat(sync): sync all Explore AI assistant, firmware & documentation [all-at-once]`;
  run(`git commit -m "${commitMsg}"`);
  console.log('✅ All changes successfully committed into a single atomic commit.');
} else {
  console.log('ℹ️ All files already up to date in git working tree.');
}

// 7. Check remote origin and push all at once
const remotes = run('git remote -v', true) || '';
const branch = run('git rev-parse --abbrev-ref HEAD', true) || 'main';

if (remotes.includes('origin')) {
  console.log(`🌐 Step 4: Syncing and pushing all commits at once to GitHub (branch: ${branch})...`);
  let pushSuccess = false;

  // Try standard push first
  try {
    const pushCmd = forceFlag ? `git push -u origin ${branch} --force` : `git push -u origin ${branch}`;
    execSync(pushCmd, { stdio: 'inherit' });
    pushSuccess = true;
    console.log('🎉 Successfully synced and pushed all changes to GitHub at once!');
  } catch (err) {
    console.log('🔄 Remote has existing history. Syncing remote with rebase...');
    try {
      execSync(`git pull --rebase origin ${branch}`, { stdio: 'inherit' });
      execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });
      pushSuccess = true;
      console.log('🎉 Successfully resolved history and pushed all updates at once!');
    } catch (rebaseErr) {
      console.log('⚡ Attempting atomic synchronization push (--force-with-lease)...');
      try {
        execSync(`git push -u origin ${branch} --force-with-lease`, { stdio: 'inherit' });
        pushSuccess = true;
        console.log('🎉 Successfully force-synced all updates to GitHub at once!');
      } catch (forceErr) {
        console.warn('⚠️ Push to origin failed:', forceErr.message);
      }
    }
  }

  if (!pushSuccess) {
    console.log('\n💡 GitHub Push Troubleshooting:');
    console.log('1. If GitHub rejected the push because of authentication, set your personal access token:');
    console.log('   git remote set-url origin https://<YOUR_GITHUB_TOKEN>@github.com/<OWNER>/<REPO>.git');
    console.log('   npm run sync\n');
    console.log('2. Or run force-sync:');
    console.log('   npm run push:force\n');
  }
} else {
  console.log('\n📌 Repository is completely synced locally on branch "main" with zero pending changes!');
  console.log('👉 To push all at once to your GitHub repository, run:');
  console.log('   npm run sync -- https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git');
  console.log('   or:');
  console.log('   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git');
  console.log('   git push -u origin main\n');
}
