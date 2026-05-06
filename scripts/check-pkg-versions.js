#!/usr/bin/env node
/**
 * Pre-commit guard: existing dependency versions cannot be changed.
 * New packages may be added freely; removals are also allowed.
 */

const { execSync } = require('child_process');

const PACKAGE_FILES = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
];

const DEP_KEYS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

function getStagedContent(file) {
  try {
    return execSync(`git show :${file}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    return null;
  }
}

function getHeadContent(file) {
  try {
    return execSync(`git show HEAD:${file}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    return null;
  }
}

let failed = false;

for (const file of PACKAGE_FILES) {
  const headRaw = getHeadContent(file);
  if (!headRaw) continue; // new file, nothing to protect

  const stagedRaw = getStagedContent(file);
  if (!stagedRaw) continue; // not staged, skip

  const headPkg = JSON.parse(headRaw);
  const stagedPkg = JSON.parse(stagedRaw);

  for (const key of DEP_KEYS) {
    const oldDeps = headPkg[key] || {};
    const newDeps = stagedPkg[key] || {};

    for (const [pkg, oldVersion] of Object.entries(oldDeps)) {
      const newVersion = newDeps[pkg];
      if (newVersion !== undefined && newVersion !== oldVersion) {
        console.error(`\x1b[31m✖ ${file} » "${pkg}": ${oldVersion} → ${newVersion}\x1b[0m`);
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error('\n\x1b[31mCommit rejected: existing dependency versions cannot be changed.\x1b[0m');
  console.error('You may add new packages, but must not alter pinned versions.\n');
  process.exit(1);
}
