const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { runBootstrap, runDoctor, runUpdateKyos, addCapability } = require("../src/core/workflows");

function mkTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function exists(dir, relativePath) {
  return fs.existsSync(path.join(dir, ...relativePath.split("/")));
}

module.exports = function register(test) {
  test("bootstrap creates .kyos and .claude in a fresh repo", () => {
    const cwd = mkTempDir("kyos-flow-");
    fs.writeFileSync(path.join(cwd, ".gitignore"), "node_modules/\n", "utf8");
    const result = runBootstrap({ cwd, apply: false });

    assert.equal(result.ok, true);
    assert.ok(exists(cwd, ".kyos/config.json"));
    assert.ok(exists(cwd, ".kyos/lock.json"));
    assert.ok(exists(cwd, ".kyos/claude/settings.json"));
    assert.ok(exists(cwd, ".kyos/claude/rules/README.md"));
    assert.ok(exists(cwd, "CLAUDE.md"));

    assert.ok(exists(cwd, ".kyos/claude/commands/README.md"));
    assert.ok(exists(cwd, ".kyos/claude/commands/spec.md"));
    assert.ok(exists(cwd, ".kyos/claude/agents/security-engineer.md"));
    assert.ok(exists(cwd, ".kyos/claude/agents/silent-executor.md"));
    assert.ok(exists(cwd, ".kyos/claude/skills/silent-executor/SKILL.md"));

    assert.ok(exists(cwd, ".claude/commands/README.md"));
    assert.ok(exists(cwd, ".claude/commands/spec.md"));
    assert.ok(exists(cwd, ".claude/commands/architecture.md"));
    assert.equal(exists(cwd, ".claude/agents/security-engineer.md"), false);
    assert.ok(exists(cwd, ".claude/agents/silent-executor.md"));

    const silentExecutor = fs.readFileSync(path.join(cwd, ".claude", "agents", "silent-executor.md"), "utf8");
    assert.ok(silentExecutor.includes("model: haiku"));
    assert.ok(silentExecutor.includes("../../.kyos/claude/agents/silent-executor.md"));

    const managedSpec = fs.readFileSync(path.join(cwd, ".kyos", "claude", "commands", "spec.md"), "utf8");
    const localSpec = fs.readFileSync(path.join(cwd, ".claude", "commands", "spec.md"), "utf8");
    assert.ok(localSpec.includes("../../.kyos/claude/commands/spec.md"));
    assert.ok(localSpec.includes("/kyos:spec"));
    assert.ok(localSpec.length < managedSpec.length);

    const managedArchitecture = fs.readFileSync(
      path.join(cwd, ".kyos", "claude", "commands", "architecture.md"),
      "utf8"
    );
    const localArchitecture = fs.readFileSync(path.join(cwd, ".claude", "commands", "architecture.md"), "utf8");
    assert.ok(localArchitecture.includes("../../.kyos/claude/commands/architecture.md"));
    assert.ok(localArchitecture.includes("/kyos:architecture"));
    assert.ok(localArchitecture.length < managedArchitecture.length);

    const managedReadme = fs.readFileSync(path.join(cwd, ".kyos", "claude", "commands", "README.md"), "utf8");
    const localReadme = fs.readFileSync(path.join(cwd, ".claude", "commands", "README.md"), "utf8");
    assert.ok(localReadme.includes("../../.kyos/claude/commands/README.md"));
    assert.ok(localReadme.length < managedReadme.length);

    const catalogSpec = fs.readFileSync(
      path.join(__dirname, "..", "catalog", "claude-base", "claude", "commands", "spec.md"),
      "utf8"
    );
    assert.equal(managedSpec, catalogSpec);
    assert.ok(exists(cwd, ".claude/agents/README.md"));
    assert.ok(exists(cwd, ".claude/rules/README.md"));
    assert.ok(exists(cwd, ".claude/skills/README.md"));
    assert.ok(exists(cwd, ".claude/skills/silent-executor/SKILL.md"));

    const gitignore = fs.readFileSync(path.join(cwd, ".gitignore"), "utf8");
    assert.ok(gitignore.includes("node_modules/"));
    assert.ok(gitignore.includes(".kyos/"));
  });

  test("bootstrap creates .gitignore with .kyos/ when missing", () => {
    const cwd = mkTempDir("kyos-gitignore-missing-");

    const result = runBootstrap({ cwd, apply: false });
    assert.equal(result.ok, true);

    const gitignorePath = path.join(cwd, ".gitignore");
    assert.ok(fs.existsSync(gitignorePath));

    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    assert.ok(gitignore.includes(".kyos/"));
  });

  test("bootstrap appends .kyos/ to an existing .gitignore", () => {
    const cwd = mkTempDir("kyos-gitignore-existing-");
    fs.writeFileSync(path.join(cwd, ".gitignore"), "node_modules/\n", "utf8");

    const result = runBootstrap({ cwd, apply: false });
    assert.equal(result.ok, true);

    const gitignore = fs.readFileSync(path.join(cwd, ".gitignore"), "utf8");
    assert.ok(gitignore.includes("node_modules/"));

    const lines = gitignore.replace(/\r\n/g, "\n").split("\n");
    const kyosCount = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed === ".kyos" || trimmed === ".kyos/";
    }).length;

    assert.equal(kyosCount, 1);
  });

  test("init switches to analysis mode once Claude setup exists", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const result = runBootstrap({ cwd, apply: false });
    assert.equal(result.ok, true);
    assert.ok(Array.isArray(result.warnings));
    assert.ok(result.warnings.some((w) => String(w).toLowerCase().includes("no files were changed")));
    assert.ok(result.warnings.some((w) => String(w).toLowerCase().includes("no changes detected")));
  });

  test("analysis warning mentions force when safe updates exist", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    fs.rmSync(path.join(cwd, ".kyos", "claude", "commands", "spec.md"));

    const result = runBootstrap({ cwd, apply: false });
    assert.equal(result.ok, true);
    assert.ok(result.warnings.some((w) => String(w).toLowerCase().includes("--force")));
  });

  test("doctor is ok after bootstrap", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const doctor = runDoctor({ cwd });
    assert.equal(doctor.ok, true);
    assert.ok(doctor.lines.some((line) => String(line).includes("command: architecture.md local wrapper ok")));
    assert.ok(doctor.lines.some((line) => String(line).includes("command: architecture.md") && String(line).includes("managed ok")));
  });

  test("doctor reports when a .claude command wrapper changes", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const architecturePath = path.join(cwd, ".claude", "commands", "architecture.md");
    const original = fs.readFileSync(architecturePath, "utf8");
    fs.writeFileSync(architecturePath, `${original}\ncustom note\n`, "utf8");

    const doctor = runDoctor({ cwd });
    assert.equal(doctor.ok, true);
    assert.ok(
      doctor.lines.some((line) => String(line).includes("command: architecture.md") && String(line).includes("local changed"))
    );
  });

  test("--force resets .claude/.kyos/CLAUDE.md", () => {
    const cwd = mkTempDir("kyos-force-");
    runBootstrap({ cwd, apply: false });

    fs.writeFileSync(path.join(cwd, "CLAUDE.md"), "# custom\n", "utf8");
    fs.writeFileSync(path.join(cwd, ".claude", "commands", "spec.md"), "# custom spec\n", "utf8");
    fs.mkdirSync(path.join(cwd, ".claude", "commands", "extra"), { recursive: true });
    fs.writeFileSync(path.join(cwd, ".claude", "commands", "extra", "note.md"), "hello", "utf8");

    const result = runBootstrap({ cwd, apply: false, force: true });
    assert.equal(result.ok, true);

    const resetClaude = fs.readFileSync(path.join(cwd, "CLAUDE.md"), "utf8");
    assert.ok(resetClaude.includes("kyos-cli"));
    assert.notEqual(resetClaude, "# custom\n");

    assert.equal(exists(cwd, ".claude/commands/extra/note.md"), false);

    const localSpec = fs.readFileSync(path.join(cwd, ".claude", "commands", "spec.md"), "utf8");
    assert.ok(localSpec.includes("../../.kyos/claude/commands/spec.md"));
    assert.ok(localSpec.includes("/kyos:spec"));

    assert.ok(exists(cwd, ".kyos/claude/commands/spec.md"));
  });

  test("--update rewrites only .kyos", () => {
    const cwd = mkTempDir("kyos-update-");
    runBootstrap({ cwd, apply: false });

    const localSpecPath = path.join(cwd, ".claude", "commands", "spec.md");
    fs.writeFileSync(localSpecPath, "# custom spec\n", "utf8");

    const managedSpecPath = path.join(cwd, ".kyos", "claude", "commands", "spec.md");
    fs.writeFileSync(managedSpecPath, "# tampered managed spec\n", "utf8");

    const result = runUpdateKyos({ cwd });
    assert.equal(result.ok, true);

    // .claude should be untouched
    assert.equal(fs.readFileSync(localSpecPath, "utf8"), "# custom spec\n");

    // .kyos should be regenerated to catalog baseline
    const catalogSpec = fs.readFileSync(
      path.join(__dirname, "..", "catalog", "claude-base", "claude", "commands", "spec.md"),
      "utf8"
    );
    assert.equal(fs.readFileSync(managedSpecPath, "utf8"), catalogSpec);
  });

  test(".claude command wrappers are not overwritten if customized", () => {
    const cwd = mkTempDir("kyos-flow-");
    runBootstrap({ cwd, apply: false });

    const localSpecPath = path.join(cwd, ".claude", "commands", "spec.md");
    fs.writeFileSync(localSpecPath, "# custom spec\n", "utf8");

    runBootstrap({ cwd, apply: true });

    const after = fs.readFileSync(localSpecPath, "utf8");
    assert.equal(after, "# custom spec\n");
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
    assert.ok(exists(cwd, ".claude/skills/release-notes/SKILL.md"));
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

    assert.throws(() => runBootstrap({ cwd, apply: false }), /symlink|junction|outside repo root/i);
    assert.equal(exists(outside, "commands/README.md"), false);
    assert.equal(exists(outside, "settings.json"), false);
  });
};
