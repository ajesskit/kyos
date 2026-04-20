const fs = require("fs");
const path = require("path");
const { getCapability, loadCatalog } = require("./catalog");
const {
  CLAUDE_MD_FILE,
  CLAUDE_ROOT,
  LOCAL_ROOT,
  LOCK_FILE,
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
const { readJsonIfExists, resolveRepoPath, writeTextFile } = require("./fs");
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

  if (!readJsonIfExists(resolveRepoPath(cwd, USER_CONFIG_FILE))) {
    saveUserConfig(cwd, config);
  }

  const created = plan.results.filter((item) => item.action === "create").length;
  const updated = plan.results.filter((item) => item.action === "update").length;
  const conflicts = plan.results.filter((item) => item.action === "conflict").length;
  const blocked = plan.results.filter((item) => item.action === "blocked").length;

  if (!hasExistingClaudeSetup || apply) {
    applyManagedChanges({ cwd, plan });
  }

  const lines = plan.results
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
        "Review the proposal, then run 'npx kyos --apply' to apply only safe create/update actions.",
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
    warnings.push(`${USER_CONFIG_FILE} is missing. Run 'npx kyos --init' to create it.`);
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
  const targetFile = resolveRepoPath(cwd, `${LOCAL_ROOT}/${folderName}/${name}/README.md`);
  writeTextFile(targetFile, createOverrideTemplate({ type: normalizedType, name, capability }));
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

- Keep framework-managed assets under \`.claude/\`.
- Store repo-specific logic under \`.claude-local/\`.
- Document any coupling to generated commands, agents, or skills.
`;
}

function detectExistingClaudeSetup(cwd) {
  return fs.existsSync(resolveRepoPath(cwd, CLAUDE_ROOT)) || fs.existsSync(resolveRepoPath(cwd, CLAUDE_MD_FILE));
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
