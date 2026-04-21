const path = require("node:path");

class SkipError extends Error {
  constructor(message) {
    super(message || "skipped");
    this.name = "SkipError";
  }
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test.skip = function skip(name, reason) {
  tests.push({
    name,
    fn: (t) => t.skip(reason || "skipped"),
  });
};

function makeContext() {
  return {
    skip(reason) {
      throw new SkipError(reason);
    },
  };
}

function registerSuite(registerFn) {
  registerFn((name, fn) => test(name, fn));
}

registerSuite(require(path.join(__dirname, "flow.test.js")));

let failed = 0;
let skipped = 0;

for (const entry of tests) {
  const t = makeContext();
  try {
    entry.fn(t);
    process.stdout.write(`ok - ${entry.name}\n`);
  } catch (error) {
    if (error instanceof SkipError) {
      skipped += 1;
      process.stdout.write(`skip - ${entry.name}${error.message ? ` (${error.message})` : ""}\n`);
      continue;
    }

    failed += 1;
    process.stdout.write(`not ok - ${entry.name}\n`);
    process.stdout.write(`  ${String(error && error.stack ? error.stack : error)}\n`);
  }
}

process.stdout.write(`\n# tests ${tests.length}\n`);
process.stdout.write(`# pass  ${tests.length - failed - skipped}\n`);
process.stdout.write(`# skip  ${skipped}\n`);
process.stdout.write(`# fail  ${failed}\n`);

process.exitCode = failed === 0 ? 0 : 1;

