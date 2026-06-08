const path = require("path");
const {
  MCP_CONFIG_FILE,
  USER_CONFIG_FILE,
} = require("./constants");
const { readJsonIfExists, writeRepoTextFile } = require("./fs");
const { stableStringify } = require("./json");

function getDefaultConfig(repoName) {
  return {
    $schema: "https://example.com/kyos.schema.json",
    repoName,
    extends: ["claude-base"],
    installed: {
      agents: [],
      mcps: [],
      skills: [],
    },
    paths: {
      claudeMd: "CLAUDE.md",
      managedSourceDir: ".kyos/claude",
      customClaudeDir: ".claude"
    },
    policy: {
      analyzeExistingBeforeApply: true,
      neverOverwriteUnmanagedFiles: true,
    },
  };
}

function loadUserConfig(cwd, repoName) {
  const configPath = path.resolve(cwd, USER_CONFIG_FILE);
  const config = readJsonIfExists(configPath);
  return config || getDefaultConfig(repoName);
}

function saveUserConfig(cwd, config) {
  writeRepoTextFile(cwd, USER_CONFIG_FILE, stableStringify(config));
}

function loadMcpConfig(cwd) {
  const filePath = path.resolve(cwd, MCP_CONFIG_FILE);
  const data = readJsonIfExists(filePath) || {};
  return { enabledPlugins: data.enabledPlugins || {} };
}

function saveMcpConfig(cwd, mcpConfig) {
  const filePath = path.resolve(cwd, MCP_CONFIG_FILE);
  const existing = readJsonIfExists(filePath) || {};
  writeRepoTextFile(cwd, MCP_CONFIG_FILE, stableStringify({ ...existing, enabledPlugins: mcpConfig.enabledPlugins }));
}

const BASE_AGENT_HOOK = {
  matcher: "Agent",
  hooks: [
    {
      type: "command",
      command:
        "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"PROCESS RULE: A subagent just completed. If the user now reports a bug or issue with its output, re-spawn the SAME agent type via the Agent tool — do NOT call Edit or Write inline. Only fix inline if it is a single-line typo or wiring mistake faster to correct than to brief an agent (per .claude/rules/process.md).\"}}' ",
    },
  ],
};

function ensureBaseHooks(cwd) {
  const existing = readJsonIfExists(path.resolve(cwd, MCP_CONFIG_FILE)) || {};
  const postToolUse = (existing.hooks && existing.hooks.PostToolUse) || [];
  if (postToolUse.some((entry) => entry.matcher === "Agent")) {
    return false;
  }
  const merged = {
    ...existing,
    hooks: {
      ...(existing.hooks || {}),
      PostToolUse: [...postToolUse, BASE_AGENT_HOOK],
    },
  };
  writeRepoTextFile(cwd, MCP_CONFIG_FILE, stableStringify(merged));
  return true;
}

function addInstalledCapability(config, type, name) {
  const bucket = config.installed[type];
  if (!Array.isArray(bucket)) {
    config.installed[type] = [name];
    return;
  }

  if (!bucket.includes(name)) {
    bucket.push(name);
    bucket.sort();
  }
}

module.exports = {
  addInstalledCapability,
  ensureBaseHooks,
  getDefaultConfig,
  loadMcpConfig,
  loadUserConfig,
  saveMcpConfig,
  saveUserConfig,
};
