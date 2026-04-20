const path = require("path");

const FRAMEWORK_NAME = "kyos";
const FRAMEWORK_PACKAGE = "kyos";
const FRAMEWORK_VERSION = "0.2.0";
const STATE_ROOT = ".kyos";
const CLAUDE_ROOT = ".claude";
const LOCAL_ROOT = ".claude-local";
const CLAUDE_MD_FILE = "CLAUDE.md";
const LOCK_FILE = path.posix.join(STATE_ROOT, "lock.json");
const VERSION_FILE = path.posix.join(STATE_ROOT, "version.json");
const USER_CONFIG_FILE = path.posix.join(STATE_ROOT, "config.json");
const MCP_CONFIG_FILE = ".mcp.json";
const CATALOG_FILE = path.resolve(__dirname, "../../catalog/registry.json");

module.exports = {
  CATALOG_FILE,
  CLAUDE_MD_FILE,
  CLAUDE_ROOT,
  FRAMEWORK_NAME,
  FRAMEWORK_PACKAGE,
  FRAMEWORK_VERSION,
  LOCAL_ROOT,
  LOCK_FILE,
  MCP_CONFIG_FILE,
  STATE_ROOT,
  USER_CONFIG_FILE,
  VERSION_FILE,
};
