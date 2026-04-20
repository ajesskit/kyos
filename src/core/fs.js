const fs = require("fs");
const path = require("path");

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join(path.posix.sep);
}

function resolveRepoPath(cwd, relativePath) {
  const segments = relativePath.split(/[\\/]/g);
  return path.resolve(cwd, ...segments);
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, "utf8");
}

function readJsonIfExists(filePath) {
  const text = readTextIfExists(filePath);
  if (text === null) {
    return null;
  }

  return JSON.parse(text);
}

function writeTextFile(filePath, content) {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, content, "utf8");
}

function listExistingManagedFiles(cwd, rootFolder) {
  const absoluteRoot = path.resolve(cwd, rootFolder);
  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }

  const collected = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absoluteChild = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(absoluteChild);
        continue;
      }

      const relativePath = path.relative(cwd, absoluteChild);
      collected.push(normalizeRelativePath(relativePath));
    }
  }

  walk(absoluteRoot);
  return collected.sort();
}

module.exports = {
  listExistingManagedFiles,
  normalizeRelativePath,
  readJsonIfExists,
  readTextIfExists,
  resolveRepoPath,
  writeTextFile,
};
