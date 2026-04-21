const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { runBootstrap, runDoctor, addCapability } = require("../src/core/workflows");

function mkTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function exists(dir, relativePath) {
  return fs.existsSync(path.join(dir, ...relativePath.split("/")));
}

module.exports = function register(test) {
  test("bootstrap creates .kyos and .claude in a fresh repo", () => {
    const cwd = mkTempDir("kyos-flow-");
    const result = runBootstrap({ cwd, apply: false });

    assert.equal(result.ok, true);
    assert.ok(exists(cwd, ".kyos/config.json"));
    assert.ok(exists(cwd, ".kyos/lock.json"));
    assert.ok(exists(cwd, ".kyos/claude/settings.json"));
    assert.ok(exists(cwd, ".kyos/claude/rules/README.md"));
    assert.ok(exists(cwd, "CLAUDE.md"));

    assert.ok(exists(cwd, ".claude/commands/README.md"));
    assert.ok(exists(cwd, ".claude/commands/spec.md"));
    assert.ok(exists(cwd, ".claude/agents/README.md"));
    assert.ok(exists(cwd, ".claude/rules/README.md"));
    assert.ok(exists(cwd, ".claude/skills/README.md"));
  });

  test("init switches to analysis mode once Claude setup exists", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const result = runBootstrap({ cwd, apply: false });
    assert.equal(result.ok, true);
    assert.ok(Array.isArray(result.warnings));
    assert.ok(result.warnings.some((w) => String(w).toLowerCase().includes("no files were changed")));
  });

  test("apply is idempotent after bootstrap", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const result = runBootstrap({ cwd, apply: true });
    assert.equal(result.ok, true);

    const doctor = runDoctor({ cwd });
    assert.equal(doctor.ok, true);
  });

  test("capability name validation blocks traversal-style input", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const bad = addCapability({ cwd, type: "skill", name: "..\\..\\pwned" });
    assert.equal(bad.ok, false);
    assert.ok(bad.errors && bad.errors.length > 0);
  });

  test("add skill creates a local stub under .claude", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const result = addCapability({ cwd, type: "skill", name: "release-notes" });
    assert.equal(result.ok, true);
    assert.ok(exists(cwd, ".claude/skills/release-notes/README.md"));
  });

  test("refuses to write through a symlink/junction parent (when supported)", (t) => {
    const cwd = mkTempDir("kyos-symlink-");
    const outside = mkTempDir("kyos-outside-");

    fs.mkdirSync(path.join(cwd, ".kyos"), { recursive: true });

    const linkPath = path.join(cwd, ".kyos", "claude");
    try {
      fs.symlinkSync(outside, linkPath, "junction");
    } catch (error) {
      t.skip(`symlink/junction not supported: ${String(error && error.message)}`);
      return;
    }

    assert.throws(() => runBootstrap({ cwd, apply: true }), /symlink|junction|outside repo root/i);
    assert.equal(exists(outside, "commands/README.md"), false);
    assert.equal(exists(outside, "settings.json"), false);
  });
};
