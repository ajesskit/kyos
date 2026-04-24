#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BUMP_TYPES = ["patch", "minor", "major"];
const ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = path.join(ROOT, "package.json");
const REGISTRY_JSON = path.join(ROOT, "catalog", "registry.json");

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", ...opts }).trim();
}

function bumpVersion(current, type) {
  const parts = current.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) die(`Cannot parse version '${current}'`);
  const [major, minor, patch] = parts;
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bumpType = args.find((a) => BUMP_TYPES.includes(a));

if (!bumpType) {
  die(`Usage: node scripts/release.js <patch|minor|major> [--dry-run]`);
}

// 1. Assert clean working tree
const dirty = run("git status --porcelain");
if (dirty) die(`Working tree is dirty. Commit or stash changes first:\n${dirty}`);

// 2. Read current version and compute next
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"));
const nextVersion = bumpVersion(pkg.version, bumpType);
const tag = `v${nextVersion}`;
const commitMsg = `chore: release ${tag}`;

// 3. Plan summary
console.log(`  bump:   ${pkg.version} → ${nextVersion} (${bumpType})`);
console.log(`  commit: ${commitMsg}`);
console.log(`  tag:    ${tag}`);
console.log(`  files:  package.json, catalog/registry.json`);

if (dryRun) {
  console.log("\n  dry-run — no files changed.");
  process.exit(0);
}

// 4. Apply version bump to package.json
pkg.version = nextVersion;
fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + "\n", "utf8");

// 5. Sync registry.json claude-base.version
const registry = JSON.parse(fs.readFileSync(REGISTRY_JSON, "utf8"));
registry.modules["claude-base"].version = nextVersion;
fs.writeFileSync(REGISTRY_JSON, JSON.stringify(registry, null, 2) + "\n", "utf8");

// 6. Run tests
console.log("\nrunning tests...");
try {
  run("npm test", { stdio: "inherit" });
} catch {
  // restore files before dying
  pkg.version = pkg.version; // already mutated — revert
  die("Tests failed. Version files were updated but not committed — revert manually or fix and re-run.");
}

// 7. Commit and tag
run(`git add "${PACKAGE_JSON}" "${REGISTRY_JSON}"`);
run(`git commit -m "${commitMsg}"`);
run(`git tag ${tag}`);

console.log(`\nreleased ${tag}`);
console.log(`push with: git push && git push --tags`);
