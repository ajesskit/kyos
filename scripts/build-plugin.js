#!/usr/bin/env node
"use strict";

// Builds the Claude plugin folder (plugins/kyos/) from the catalog baseline.
//
//   node scripts/build-plugin.js           write generated files
//   node scripts/build-plugin.js --check   verify only; exit 1 on drift or rule violations
//
// Generated: skill reference files (catalog SKILL.md bodies), LICENSE, plugin.json "version".
// Hand-written (never touched here except plugin.json version): README.md, skills/*/SKILL.md.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PLUGIN_ROOT = path.join(ROOT, "plugins", "kyos");
const CATALOG_SKILLS = path.join(ROOT, "catalog", "claude-base", "claude", "skills");
const MANIFEST_REL = ".claude-plugin/plugin.json";

// catalog skill name -> path (relative to PLUGIN_ROOT) of its generated reference
const REFERENCES = {
  spec: "skills/workflow/references/spec.md",
  tech: "skills/workflow/references/tech.md",
  tasks: "skills/workflow/references/tasks.md",
  implement: "skills/workflow/references/implement.md",
  hire: "skills/hire/references/repo-mode.md",
};

const MAX_FILE_BYTES = 256 * 1024; // non-image files (directory review hold above this)
const MAX_ICON_BYTES = 2 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const MIN_README_WORDS = 40;
const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const FORBIDDEN_NAMES = new Set([
  "package.json",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "bun.lock",
  "bun.lockb",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".npmrc",
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  "__MACOSX",
]);

function normalize(text) {
  return text.replace(/\r\n/g, "\n");
}

function readText(absPath) {
  return normalize(fs.readFileSync(absPath, "utf8"));
}

// Resolve a plugin-relative path, refusing anything that could escape PLUGIN_ROOT.
function pluginPath(relPath) {
  if (path.isAbsolute(relPath) || relPath.split(/[\\/]/).includes("..")) {
    throw new Error(`Refusing unsafe plugin path: ${relPath}`);
  }
  const abs = path.resolve(PLUGIN_ROOT, relPath);
  if (abs !== PLUGIN_ROOT && !abs.startsWith(PLUGIN_ROOT + path.sep)) {
    throw new Error(`Path escapes plugin folder: ${relPath}`);
  }
  return abs;
}

function splitFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { frontmatter: null, body: text };
  return { frontmatter: match[1], body: text.slice(match[0].length) };
}

// Minimal parser for the flat "key: value" frontmatter our skills use.
function parseFrontmatter(raw) {
  const out = {};
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!m) {
      // indented continuation / list item: mark the previous key as non-scalar
      const keys = Object.keys(out);
      if (keys.length) out[keys[keys.length - 1]] = { nonScalar: true };
      continue;
    }
    let value = m[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    out[m[1]] = value === "" || value.startsWith("[") ? { nonScalar: true } : value;
  }
  return out;
}

function generatedReference(skill, catalogSkills = CATALOG_SKILLS) {
  const source = path.join(catalogSkills, skill, "SKILL.md");
  const { body } = splitFrontmatter(readText(source));
  const header =
    `<!-- generated from catalog/claude-base/claude/skills/${skill}/SKILL.md; ` +
    `do not edit by hand -->\n\n`;
  return header + body.replace(/^\n+/, "");
}

function expectedManifest() {
  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const manifest = JSON.parse(readText(pluginPath(MANIFEST_REL)));
  manifest.version = version;
  return JSON.stringify(manifest, null, 2) + "\n";
}

// Map<pluginRelativePath, expectedContent>. opts.catalogSkills overrides the catalog source (tests).
function buildExpected(opts = {}) {
  const files = new Map();
  for (const [skill, rel] of Object.entries(REFERENCES)) {
    files.set(rel, generatedReference(skill, opts.catalogSkills));
  }
  files.set("LICENSE", readText(path.join(ROOT, "LICENSE")));
  files.set(MANIFEST_REL, expectedManifest());
  return files;
}

function write() {
  const written = [];
  for (const [rel, content] of buildExpected()) {
    const abs = pluginPath(rel);
    const current = fs.existsSync(abs) ? readText(abs) : null;
    if (current === content) continue;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
    written.push(rel);
  }
  return written;
}

function walk(dir, rel = "") {
  const entries = [];
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${dirent.name}` : dirent.name;
    const abs = path.join(dir, dirent.name);
    entries.push({ rel: childRel, abs, dirent });
    if (dirent.isDirectory()) entries.push(...walk(abs, childRel));
  }
  return entries;
}

function countWordsOutsideFences(markdown) {
  const withoutFences = normalize(markdown).replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, "");
  return withoutFences.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function ruleViolations() {
  const violations = [];
  if (!fs.existsSync(PLUGIN_ROOT)) return ["plugins/kyos/ does not exist"];

  const readme = pluginPath("README.md");
  if (!fs.existsSync(readme)) {
    violations.push("README.md is missing");
  } else {
    const words = countWordsOutsideFences(fs.readFileSync(readme, "utf8"));
    if (words < MIN_README_WORDS) {
      violations.push(`README.md has ${words} words outside code blocks (needs ${MIN_README_WORDS})`);
    }
  }

  if (!fs.existsSync(pluginPath("LICENSE"))) violations.push("LICENSE is missing");

  const manifestPath = pluginPath(MANIFEST_REL);
  if (!fs.existsSync(manifestPath)) {
    violations.push(`${MANIFEST_REL} is missing`);
  } else {
    try {
      const manifest = JSON.parse(readText(manifestPath));
      if (typeof manifest.name !== "string" || !NAME_PATTERN.test(manifest.name)) {
        violations.push(`plugin.json name "${manifest.name}" must be lowercase letters, digits and hyphens`);
      }
      for (const key of ["description", "version", "author", "license"]) {
        if (!manifest[key]) violations.push(`plugin.json is missing "${key}"`);
      }
    } catch (error) {
      violations.push(`plugin.json is not valid JSON: ${error.message}`);
    }
  }

  for (const { rel, abs, dirent } of walk(PLUGIN_ROOT)) {
    if (dirent.isSymbolicLink()) violations.push(`${rel}: symbolic links are not allowed`);
    if (FORBIDDEN_NAMES.has(dirent.name)) violations.push(`${rel}: file not allowed in plugin folder`);
    if (rel === "bin") violations.push("bin/: a top-level bin/ blocks install in chat and Cowork");
    if (dirent.isFile()) {
      const isImage = IMAGE_EXTENSIONS.has(path.extname(dirent.name).toLowerCase());
      const size = fs.statSync(abs).size;
      if (!isImage && size > MAX_FILE_BYTES) violations.push(`${rel}: larger than 256 KiB`);
      if (isImage && rel.startsWith(".claude-plugin/icon") && size > MAX_ICON_BYTES) {
        violations.push(`${rel}: icon must be under 2 MB`);
      }
    }
  }

  const skillsDir = pluginPath("skills");
  if (fs.existsSync(skillsDir)) {
    for (const dirent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const rel = `skills/${dirent.name}/SKILL.md`;
      const abs = pluginPath(rel);
      if (!fs.existsSync(abs)) {
        violations.push(`${rel} is missing`);
        continue;
      }
      const { frontmatter } = splitFrontmatter(readText(abs));
      if (frontmatter === null) {
        violations.push(`${rel}: missing YAML frontmatter`);
        continue;
      }
      const fm = parseFrontmatter(frontmatter);
      if (typeof fm.description !== "string" || !fm.description) {
        violations.push(`${rel}: "description" must be a single text value`);
      }
      if (fm.name !== dirent.name) {
        violations.push(`${rel}: name "${fm.name}" must match folder "${dirent.name}"`);
      }
    }
  }

  return violations;
}

function check(opts = {}) {
  const stale = [];
  for (const [rel, content] of buildExpected(opts)) {
    const abs = pluginPath(rel);
    if (!fs.existsSync(abs) || readText(abs) !== content) stale.push(rel);
  }
  return { stale, violations: ruleViolations() };
}

module.exports = { buildExpected, write, check, countWordsOutsideFences, PLUGIN_ROOT, CATALOG_SKILLS, REFERENCES };

if (require.main === module) {
  if (process.argv.includes("--check")) {
    const { stale, violations } = check();
    for (const rel of stale) console.error(`stale: plugins/kyos/${rel} (run: npm run build:plugin)`);
    for (const v of violations) console.error(`violation: ${v}`);
    if (stale.length || violations.length) process.exit(1);
    console.log("plugins/kyos is in sync and passes directory rules");
  } else {
    const written = write();
    for (const rel of written) console.log(`wrote plugins/kyos/${rel}`);
    if (!written.length) console.log("plugins/kyos is already up to date");
    const violations = ruleViolations();
    for (const v of violations) console.error(`violation: ${v}`);
    if (violations.length) process.exit(1);
  }
}
