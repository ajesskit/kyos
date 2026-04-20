const {
  FRAMEWORK_NAME,
  FRAMEWORK_VERSION,
  USER_CONFIG_FILE,
} = require("./core/constants");
const {
  addCapability,
  runAnalyze,
  runBootstrap,
  runDoctor,
} = require("./core/workflows");

function printHelp() {
  console.log(`${FRAMEWORK_NAME} v${FRAMEWORK_VERSION}

Usage:
  agentic-framework-init
  agentic-framework-init --apply
  agentic-framework-init analyze
  agentic-framework-init apply
  agentic-framework-init doctor
  agentic-framework-init add skill <name>
  agentic-framework-init add agent <name>
  agentic-framework-init add mcp <name>

Notes:
  - Commands run against the current working directory only.
  - If no Claude setup exists yet, the default command installs a base structure.
  - If .claude/ or CLAUDE.md already exists, the default command analyzes and proposes updates without changing files.
  - Use '--apply' to apply only safe create/update actions after review.
  - Managed state lives in .agentic-framework/.
  - Repo-specific customizations belong in .claude-local/.
  - User-editable configuration lives in ${USER_CONFIG_FILE}.`);
}

function printResult(result) {
  if (result.summary) {
    console.log(result.summary);
  }

  if (result.lines && result.lines.length > 0) {
    for (const line of result.lines) {
      console.log(line);
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log("");
    for (const warning of result.warnings) {
      console.warn(`warning: ${warning}`);
    }
  }

  if (result.errors && result.errors.length > 0) {
    console.log("");
    for (const error of result.errors) {
      console.error(`error: ${error}`);
    }
  }

  process.exitCode = result.ok ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const applyFlag = args.includes("--apply");
  const cwd = process.cwd();

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (!command || command === "--apply") {
    printResult(runBootstrap({ cwd, apply: applyFlag }));
    return;
  }

  if (command === "analyze") {
    printResult(runAnalyze({ cwd }));
    return;
  }

  if (command === "apply") {
    printResult(runBootstrap({ cwd, apply: true }));
    return;
  }

  if (command === "doctor") {
    printResult(runDoctor({ cwd }));
    return;
  }

  if (command === "add") {
    const type = args[1];
    const name = args[2];

    if (!type || !name) {
      printResult({
        ok: false,
        errors: ["Usage: agentic-framework-init add <skill|agent|mcp> <name>"],
      });
      return;
    }

    printResult(addCapability({ cwd, type, name }));
    return;
  }

  printResult({
    ok: false,
    errors: [`Unknown command '${command}'. Run 'agentic-framework-init --help' for usage.`],
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
