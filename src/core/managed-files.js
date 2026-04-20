const path = require("path");
const {
  CLAUDE_MD_FILE,
  CLAUDE_ROOT,
  FRAMEWORK_PACKAGE,
  FRAMEWORK_VERSION,
  LOCAL_ROOT,
  LOCK_FILE,
  STATE_ROOT,
  USER_CONFIG_FILE,
  VERSION_FILE,
} = require("./constants");
const {
  listExistingManagedFiles,
  normalizeRelativePath,
  readJsonIfExists,
  readTextIfExists,
  resolveRepoPath,
  writeTextFile,
} = require("./fs");
const { sha256 } = require("./hash");
const { stableStringify } = require("./json");

function renderManagedFiles({ cwd, config }) {
  const repoName = path.basename(cwd);
  const baseFiles = {
    [CLAUDE_MD_FILE]: `# ${repoName}

This repository uses a shared Claude Code bootstrap managed by ${FRAMEWORK_PACKAGE}.

## Working rules

- Treat \`.claude/\` as framework-managed.
- Put repo-specific additions in \`.claude-local/\`.
- Run \`npx kyos --init\` to install or analyze the base structure.
- Run \`npx kyos --apply\` after reviewing a proposal.
`,
    [normalizeRelativePath(path.join(CLAUDE_ROOT, "commands", "README.md"))]:
      "# Managed Claude Commands\n\nBase commands live here. Prefer repo-specific commands in `.claude-local/commands/`.\n",
    [normalizeRelativePath(path.join(CLAUDE_ROOT, "commands", "project-context.md"))]:
      `# Project Context\n\nCapture architecture, key commands, and testing guidance for ${repoName} here.\n\n- Baseline: ${(config.extends || ["claude-base"]).join(", ")}\n- Framework version: ${FRAMEWORK_VERSION}\n`,
    [normalizeRelativePath(path.join(CLAUDE_ROOT, "agents", "README.md"))]:
      "# Managed Claude Agents\n\nFramework-provided agent prompts live here. Keep local agent variants in `.claude-local/agents/`.\n",
    [normalizeRelativePath(path.join(CLAUDE_ROOT, "skills", "README.md"))]:
      "# Managed Claude Skills\n\nFramework-provided skills live here. Keep repo-specific skills in `.claude-local/skills/`.\n",
    [normalizeRelativePath(path.join(CLAUDE_ROOT, "settings.json"))]:
      stableStringify({
        permissions: {
          defaultMode: "ask",
        },
        statusLine: {
          showBranch: true,
          showDirty: true,
        },
      }),
    [normalizeRelativePath(path.join(LOCAL_ROOT, ".gitkeep"))]: "",
    [normalizeRelativePath(path.join(LOCAL_ROOT, "agents", ".gitkeep"))]: "",
    [normalizeRelativePath(path.join(LOCAL_ROOT, "commands", ".gitkeep"))]: "",
    [normalizeRelativePath(path.join(LOCAL_ROOT, "skills", ".gitkeep"))]: "",
    [normalizeRelativePath(path.join(LOCAL_ROOT, "README.md"))]:
      "# Local Claude Overrides\n\nAdd repo-specific commands, agents, and skills here so framework updates stay merge-safe.\n",
  };

  baseFiles[VERSION_FILE] = stableStringify({
    framework: FRAMEWORK_PACKAGE,
    managedRoot: CLAUDE_ROOT,
    repoName,
    version: FRAMEWORK_VERSION,
  });

  return baseFiles;
}

function loadLock(cwd) {
  const lockPath = resolveRepoPath(cwd, LOCK_FILE);
  return (
    readJsonIfExists(lockPath) || {
      framework: FRAMEWORK_PACKAGE,
      version: FRAMEWORK_VERSION,
      files: {},
    }
  );
}

function planManagedChanges({ cwd, desiredFiles, currentLock }) {
  const results = [];
  const finalLockFiles = { ...(currentLock.files || {}) };

  for (const [relativePath, desiredContent] of Object.entries(desiredFiles)) {
    if (relativePath === LOCK_FILE) {
      continue;
    }

    const absolutePath = resolveRepoPath(cwd, relativePath);
    const currentContent = readTextIfExists(absolutePath);
    const currentChecksum = currentContent === null ? null : sha256(currentContent);
    const desiredChecksum = sha256(desiredContent);
    const lockEntry = currentLock.files ? currentLock.files[relativePath] : null;
    const lockedChecksum = lockEntry ? lockEntry.checksum : null;

    if (currentContent === null) {
      results.push({ action: "create", path: relativePath, content: desiredContent });
      finalLockFiles[relativePath] = { checksum: desiredChecksum, managed: true };
      continue;
    }

    if (currentChecksum === desiredChecksum) {
      results.push({ action: "ok", path: relativePath });
      finalLockFiles[relativePath] = { checksum: desiredChecksum, managed: true };
      continue;
    }

    if (!lockEntry) {
      results.push({
        action: "blocked",
        path: relativePath,
        reason: "unmanaged file already exists with different content",
      });
      continue;
    }

    if (currentChecksum !== lockedChecksum) {
      results.push({
        action: "conflict",
        path: relativePath,
        reason: "local changes detected; file was not overwritten",
      });
      finalLockFiles[relativePath] = lockEntry;
      continue;
    }

    results.push({ action: "update", path: relativePath, content: desiredContent });
    finalLockFiles[relativePath] = { checksum: desiredChecksum, managed: true };
  }

  return { results, finalLockFiles };
}

function applyManagedChanges({ cwd, plan }) {
  for (const item of plan.results) {
    if (item.action !== "create" && item.action !== "update") {
      continue;
    }

    writeTextFile(resolveRepoPath(cwd, item.path), item.content);
  }

  writeTextFile(
    resolveRepoPath(cwd, LOCK_FILE),
    stableStringify({
      framework: FRAMEWORK_PACKAGE,
      version: FRAMEWORK_VERSION,
      files: plan.finalLockFiles,
    })
  );
}

function findStaleManagedFiles(cwd, desiredFiles, currentLock) {
  const ignoredPaths = new Set([LOCK_FILE, USER_CONFIG_FILE]);
  const desiredPaths = new Set(
    Object.keys(desiredFiles).filter((pathName) => !ignoredPaths.has(pathName))
  );
  const stalePaths = [];

  for (const pathName of Object.keys(currentLock.files || {})) {
    if (!ignoredPaths.has(pathName) && !desiredPaths.has(pathName)) {
      stalePaths.push(pathName);
    }
  }

  for (const rootFolder of [STATE_ROOT, CLAUDE_ROOT]) {
    for (const pathName of listExistingManagedFiles(cwd, rootFolder)) {
      if (!ignoredPaths.has(pathName) && !desiredPaths.has(pathName) && !stalePaths.includes(pathName)) {
        stalePaths.push(pathName);
      }
    }
  }

  return stalePaths.sort();
}

module.exports = {
  applyManagedChanges,
  findStaleManagedFiles,
  loadLock,
  planManagedChanges,
  renderManagedFiles,
};
