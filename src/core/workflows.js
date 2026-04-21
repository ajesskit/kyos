const fs = require("fs");
const path = require("path");
const { getCapability, loadCatalog } = require("./catalog");
const {
  CLAUDE_MD_FILE,
  CLAUDE_ROOT,
  LOCK_FILE,
  MANAGED_ROOT,
  MCP_CONFIG_FILE,
  USER_CONFIG_FILE,
} = require("./constants");
const {
  addInstalledCapability,
  loadMcpConfig,
  loadUserConfig,
  saveMcpConfig,
  saveUserConfig,
} = require("./config");
const { readJsonIfExists, resolveRepoPath, writeRepoTextFile } = require("./fs");
const { sha256 } = require("./hash");
const {
  applyManagedChanges,
  findStaleManagedFiles,
  loadLock,
  planManagedChanges,
  renderManagedFiles,
} = require("./managed-files");

function runBootstrap({ cwd, apply }) {
  const repoName = path.basename(cwd);
  const config = loadUserConfig(cwd, repoName);
  const desiredFiles = renderManagedFiles({ cwd, config });
  const currentLock = loadLock(cwd);
  const plan = planManagedChanges({ cwd, desiredFiles, currentLock });
  const hasExistingClaudeSetup = detectExistingClaudeSetup(cwd);
  const stale = findStaleManagedFiles(cwd, desiredFiles, currentLock);
  const localSeedPlan = planLocalClaudeSeed({ cwd });

  if (!readJsonIfExists(resolveRepoPath(cwd, USER_CONFIG_FILE))) {
    saveUserConfig(cwd, config);
  }

  const created =
    plan.results.filter((item) => item.action === "create").length +
    localSeedPlan.results.filter((item) => item.action === "create").length;
  const updated = plan.results.filter((item) => item.action === "update").length;
  const conflicts = plan.results.filter((item) => item.action === "conflict").length;
  const blocked = plan.results.filter((item) => item.action === "blocked").length;

  if (!hasExistingClaudeSetup || apply) {
    applyManagedChanges({ cwd, plan });
    applyLocalClaudeSeed({ cwd, plan: localSeedPlan });
  }

  const combined = [...plan.results, ...localSeedPlan.results];
  const lines = combined
    .filter((item) => item.action !== "ok" || hasExistingClaudeSetup)
    .map((item) => {
      if (hasExistingClaudeSetup && !apply) {
        return formatProposalLine(item);
      }

      if (item.reason) {
        return `${symbolForAction(item.action)} ${item.path} (${item.reason})`;
      }

      return `${symbolForAction(item.action)} ${item.path}`;
    });

  for (const stalePath of stale) {
    lines.push(`! ${stalePath} (managed previously but no longer part of the current base set)`);
  }

  if (hasExistingClaudeSetup && !apply) {
    return {
      ok: true,
      summary: `analysis complete: ${created} proposed additions, ${updated} proposed updates, ${conflicts} managed conflicts, ${blocked} unmanaged blockers.`,
      lines,
      warnings: [
        "No files were changed because this repo already has Claude configuration.",
        "Review the proposal, then run 'npx kyos-cli --apply' to apply only safe create/update actions.",
      ],
    };
  }

  return {
    ok: conflicts === 0 && blocked === 0,
    summary: hasExistingClaudeSetup
      ? `apply complete: ${created} created, ${updated} updated, ${conflicts} conflicts, ${blocked} blocked.`
      : `bootstrap complete: ${created} created, ${updated} updated, ${conflicts} conflicts, ${blocked} blocked.`,
    lines,
    warnings: stale.length > 0 ? ["Stale managed files were detected. Review them before removing anything."] : [],
  };
}

function planLocalClaudeSeed({ cwd }) {
  const seedFiles = {
    [`${CLAUDE_ROOT}/agents/README.md`]:
      "# Local Agents\n\nPut repo-specific agents here. This folder is intentionally yours; kyos will not overwrite local agents.\n",
    [`${CLAUDE_ROOT}/skills/README.md`]:
      "# Local Skills\n\nPut repo-specific skills here. These are repo-owned instructions that complement the managed base under `.kyos/claude/`.\n",
    [`${CLAUDE_ROOT}/rules/README.md`]:
      "# Local Rules\n\nPut repo-specific working rules here (coding standards, review expectations, release rules, security notes).\n",
    [`${CLAUDE_ROOT}/commands/README.md`]:
      "# Local Commands\n\nThis folder is for repo-owned workflow prompts (slash-style commands).\n\nRecommended daily flow:\n\n`/kyos:spec -> /kyos:tech -> /kyos:tasks -> /kyos:implement -> /kyos:verify`\n",
    [`${CLAUDE_ROOT}/commands/architecture.md`]:
      "# /kyos:architecture\n\nUse when the repo needs a directional refresh: clarify the target architecture, boundaries, and the few decisions that should not be revisited every task.\n",
    [`${CLAUDE_ROOT}/commands/hire.md`]:
      "# /kyos:hire\n\nUse when the current stack needs better support: missing skills, agents, or MCPs. Prefer small, explicit additions that reduce friction for the next few tasks.\n",
    [`${CLAUDE_ROOT}/commands/spec.md`]:
      "# /kyos:spec\n\nWrite a concrete, user-facing spec: goals, non-goals, acceptance criteria, and edge cases.\n\nNext: [/kyos:tech](./tech.md)\n",
    [`${CLAUDE_ROOT}/commands/tech.md`]:
      "# /kyos:tech\n\nTurn the spec into an engineering plan: approach, data/contracts, risk list, and test strategy.\n\nNext: [/kyos:tasks](./tasks.md)\n",
    [`${CLAUDE_ROOT}/commands/tasks.md`]:
      "# /kyos:tasks\n\nBreak the plan into ordered slices that can be implemented and verified safely.\n\nNext: [/kyos:implement](./implement.md)\n",
    [`${CLAUDE_ROOT}/commands/implement.md`]:
      "# /kyos:implement\n\nImplement one slice at a time. Keep changes reviewable and run the smallest relevant verification each slice.\n\nNext: [/kyos:verify](./verify.md)\n",
    [`${CLAUDE_ROOT}/commands/verify.md`]:
      "# /kyos:verify\n\nVerify behavior against the spec and plan. If it passes, suggest deleting any completed working spec files that are no longer useful.\n\nNext cycle: [/kyos:spec](./spec.md)\n",
  };

  const results = [];
  for (const [relativePath, content] of Object.entries(seedFiles)) {
    const absolutePath = resolveRepoPath(cwd, relativePath);
    if (fs.existsSync(absolutePath)) {
      results.push({ action: "ok", path: relativePath });
      continue;
    }
    results.push({ action: "create", path: relativePath, content });
  }

  return { results };
}

function applyLocalClaudeSeed({ cwd, plan }) {
  for (const item of plan.results) {
    if (item.action !== "create") {
      continue;
    }
    writeRepoTextFile(cwd, item.path, item.content);
  }
}

function runAnalyze({ cwd }) {
  const repoName = path.basename(cwd);
  const config = loadUserConfig(cwd, repoName);
  const desiredFiles = renderManagedFiles({ cwd, config });
  const currentLock = loadLock(cwd);
  const plan = planManagedChanges({ cwd, desiredFiles, currentLock });
  const stale = findStaleManagedFiles(cwd, desiredFiles, currentLock);

  return {
    ok: true,
    summary: "analysis summary",
    lines: [
      ...plan.results.map((item) => formatProposalLine(item)),
      ...stale.map((pathName) => `! ${pathName} (stale managed file)`),
    ],
  };
}

function runDoctor({ cwd }) {
  const warnings = [];
  const errors = [];
  const repoName = path.basename(cwd);
  const config = loadUserConfig(cwd, repoName);
  const currentLock = loadLock(cwd);
  const desiredFiles = renderManagedFiles({ cwd, config });
  const stale = findStaleManagedFiles(cwd, desiredFiles, currentLock);
  const hasExistingClaudeSetup = detectExistingClaudeSetup(cwd);

  if (!readJsonIfExists(resolveRepoPath(cwd, USER_CONFIG_FILE))) {
    warnings.push(`${USER_CONFIG_FILE} is missing. Run 'npx kyos-cli --init' to create it.`);
  }

  if (!readJsonIfExists(resolveRepoPath(cwd, LOCK_FILE))) {
    warnings.push(`${LOCK_FILE} is missing. Safe managed updates are limited until the bootstrap is applied.`);
  }

  for (const [relativePath, lockEntry] of Object.entries(currentLock.files || {})) {
    const absolutePath = resolveRepoPath(cwd, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${relativePath} is tracked in the lock file but is missing from disk.`);
      continue;
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    if (sha256(content) !== lockEntry.checksum) {
      warnings.push(`${relativePath} differs from its last managed checksum.`);
    }
  }

  if (stale.length > 0) {
    warnings.push(`${stale.length} stale managed files were found.`);
  }

  const mcpConfig = loadMcpConfig(cwd);
  if (!mcpConfig.mcpServers || typeof mcpConfig.mcpServers !== "object") {
    errors.push(`${MCP_CONFIG_FILE} must contain an object with an 'mcpServers' key.`);
  }

  return {
    ok: errors.length === 0,
    summary: "doctor summary",
    lines: [
      `repo: ${repoName}`,
      `claude setup detected: ${hasExistingClaudeSetup ? "yes" : "no"}`,
      `managed files tracked: ${Object.keys(currentLock.files || {}).length}`,
      `installed skills: ${(config.installed.skills || []).length}`,
      `installed agents: ${(config.installed.agents || []).length}`,
      `installed mcps: ${(config.installed.mcps || []).length}`,
    ],
    warnings,
    errors,
  };
}

function addCapability({ cwd, type, name }) {
  const normalizedType = normalizeCapabilityType(type);
  if (!normalizedType) {
    return {
      ok: false,
      errors: ["Capability type must be one of: skill, agent, mcp."],
    };
  }

  const nameError = validateCapabilityName(name);
  if (nameError) {
    return {
      ok: false,
      errors: [nameError],
    };
  }

  const repoName = path.basename(cwd);
  const config = loadUserConfig(cwd, repoName);
  const catalog = loadCatalog();
  const capability = getCapability(catalog, normalizedType, name);

  if (normalizedType === "mcp") {
    if (!capability) {
      return {
        ok: false,
        errors: [`Unknown mcp '${name}'. Add it to catalog/registry.json first.`],
      };
    }

    const mcpConfig = loadMcpConfig(cwd);
    mcpConfig.mcpServers = mcpConfig.mcpServers || {};
    mcpConfig.mcpServers[name] = capability.definition;
    saveMcpConfig(cwd, mcpConfig);
    addInstalledCapability(config, "mcps", name);
    saveUserConfig(cwd, config);

    return {
      ok: true,
      summary: `registered mcp '${name}' in ${MCP_CONFIG_FILE}`,
      lines: capability.notes ? capability.notes.map((line) => `- ${line}`) : [],
    };
  }

  const folderName = normalizedType === "skill" ? "skills" : "agents";
  const targetRelativePath = `${CLAUDE_ROOT}/${folderName}/${name}/README.md`;
  writeRepoTextFile(cwd, targetRelativePath, createOverrideTemplate({ type: normalizedType, name, capability }));
  addInstalledCapability(config, `${folderName}`, name);
  saveUserConfig(cwd, config);

  return {
    ok: true,
    summary: `created ${normalizedType} override stub '${name}'`,
    lines: capability && capability.notes ? capability.notes.map((line) => `- ${line}`) : [],
  };
}

function normalizeCapabilityType(type) {
  if (type === "skill" || type === "agent" || type === "mcp") {
    return type;
  }

  return null;
}

function validateCapabilityName(name) {
  if (typeof name !== "string" || name.length === 0) {
    return "Capability name is required.";
  }

  // Keep capability identifiers path-safe so local stub creation cannot escape
  // the intended repo-owned `.claude` directories.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    return "Capability name may contain only letters, numbers, dots, underscores, and dashes.";
  }

  if (name.includes("..")) {
    return "Capability name may not contain '..'.";
  }

  return null;
}

function createOverrideTemplate({ type, name, capability }) {
  const title = `${type[0].toUpperCase()}${type.slice(1)} Override: ${name}`;
  const description = capability && capability.description
    ? capability.description
    : `Local ${type} customizations for ${name}.`;

  return `# ${title}

${description}

## Purpose

Describe what this repo needs to override or extend locally.

## Contract

- Keep framework-managed assets under \`.kyos/claude/\`.
- Store repo-specific logic under \`.claude/\`.
- Document any coupling to generated commands, agents, or skills.
`;
}

function detectExistingClaudeSetup(cwd) {
  return (
    fs.existsSync(resolveRepoPath(cwd, CLAUDE_ROOT)) ||
    fs.existsSync(resolveRepoPath(cwd, path.join(MANAGED_ROOT, "commands"))) ||
    fs.existsSync(resolveRepoPath(cwd, CLAUDE_MD_FILE))
  );
}

function formatProposalLine(item) {
  if (item.action === "create") {
    return `+ would add ${item.path}`;
  }

  if (item.action === "update") {
    return `~ would update ${item.path}`;
  }

  if (item.action === "ok") {
    return `= unchanged ${item.path}`;
  }

  if (item.reason) {
    return `${symbolForAction(item.action)} ${item.path} (${item.reason})`;
  }

  return `${symbolForAction(item.action)} ${item.path}`;
}

function symbolForAction(action) {
  switch (action) {
    case "create":
      return "+";
    case "update":
      return "~";
    case "conflict":
      return "!";
    case "blocked":
      return "x";
    case "ok":
      return "=";
    default:
      return "?";
  }
}

module.exports = {
  addCapability,
  runAnalyze,
  runBootstrap,
  runDoctor,
};
