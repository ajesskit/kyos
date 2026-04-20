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
  kyos --init
  kyos --apply
  kyos --analyze
  kyos --doctor
  kyos --add skill <name>
  kyos --add agent <name>
  kyos --add mcp <name>

Notes:
  - Commands run against the current working directory only.
  - Use '--init' to install a base Claude structure when none exists yet.
  - If .claude/ or CLAUDE.md already exists, '--init' switches to analysis mode and proposes updates without changing files.
  - Use '--apply' to apply only safe create/update actions after review.
  - Managed state lives in .kyos/.
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
  const cwd = process.cwd();
  const hasFlag = (flag) => args.includes(flag);

  if (hasFlag("--help") || hasFlag("-h")) {
    printHelp();
    return;
  }

  if (args.length === 0 || hasFlag("--init")) {
    printResult(runBootstrap({ cwd, apply: false }));
    return;
  }

  if (hasFlag("--apply")) {
    printResult(runBootstrap({ cwd, apply: true }));
    return;
  }

  if (hasFlag("--analyze")) {
    printResult(runAnalyze({ cwd }));
    return;
  }

  if (hasFlag("--doctor")) {
    printResult(runDoctor({ cwd }));
    return;
  }

  if (hasFlag("--add")) {
    const addIndex = args.indexOf("--add");
    const type = args[addIndex + 1];
    const name = args[addIndex + 2];

    if (!type || !name) {
      printResult({
        ok: false,
        errors: ["Usage: kyos --add <skill|agent|mcp> <name>"],
      });
      return;
    }

    printResult(addCapability({ cwd, type, name }));
    return;
  }

  printResult({
    ok: false,
    errors: ["Unknown arguments. Run 'kyos --help' for usage."],
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
