const fs = require("fs");
const path = require("path");

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join(path.posix.sep);
}

function assertSafeRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("Invalid path: expected a non-empty string.");
  }

  if (path.isAbsolute(relativePath)) {
    throw new Error(`Refusing absolute path: ${relativePath}`);
  }

  const segments = relativePath.split(/[\\/]/g).filter(Boolean);
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`Refusing path traversal segment '..' in: ${relativePath}`);
  }
}

function resolveRepoPath(cwd, relativePath) {
  assertSafeRelativePath(relativePath);
  const segments = relativePath.split(/[\\/]/g);
  return path.resolve(cwd, ...segments);
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function isPathWithinRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  if (relative === "") {
    return true;
  }
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function ensureSafeParentDirs({ cwd, relativePath }) {
  const rootReal = fs.realpathSync.native(cwd);
  const segments = relativePath.split(/[\\/]/g).filter(Boolean);
  const parentSegments = segments.slice(0, -1);

  let currentPath = cwd;
  for (const segment of parentSegments) {
    const nextPath = path.join(currentPath, segment);

    if (fs.existsSync(nextPath)) {
      const stat = fs.lstatSync(nextPath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Refusing to write through symlink/junction: ${path.relative(cwd, nextPath)}`);
      }
      if (!stat.isDirectory()) {
        throw new Error(`Expected directory but found file: ${path.relative(cwd, nextPath)}`);
      }
    } else {
      // Create the directory step-by-step so we can validate existing parents.
      fs.mkdirSync(nextPath);
    }

    currentPath = nextPath;
  }

  const parentDir = segments.length > 1 ? path.join(cwd, ...segments.slice(0, -1)) : cwd;
  const parentReal = fs.realpathSync.native(parentDir);
  if (!isPathWithinRoot(rootReal, parentReal)) {
    throw new Error(
      `Refusing to write outside repo root via symlink/junction (parent resolves outside): ${relativePath}`
    );
  }
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

function writeRepoTextFile(cwd, relativePath, content) {
  assertSafeRelativePath(relativePath);
  ensureSafeParentDirs({ cwd, relativePath });

  const absolutePath = resolveRepoPath(cwd, relativePath);
  if (fs.existsSync(absolutePath)) {
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to overwrite symlink/junction: ${relativePath}`);
    }
  }

  fs.writeFileSync(absolutePath, content, "utf8");
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
  writeRepoTextFile,
  writeTextFile,
};
