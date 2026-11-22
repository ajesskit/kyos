# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# kyos

**kyos-cli** is a Node.js CLI tool that bootstraps and safely evolves a shared Claude Code repository structure across many repos. It separates a managed source layer (`.kyos/claude/`) from a repo-owned customization layer (`.claude/`) and uses SHA256 checksums to prevent silent overwrites of local edits.

## Commands

```bash
npm test                        # Run integration tests (test/run.js → loads test/flow.test.js)
npm run lint                    # ESLint over src/, bin/ and scripts/
npm run build:plugin            # Regenerate plugins/kyos/ from the catalog (after editing catalog skills)
npm run check:plugin            # Verify plugins/kyos/ is in sync and passes directory rules (also in npm test)
npm start                       # Equivalent to: node ./bin/kyos.js --init
node ./bin/kyos.js --init       # Bootstrap, or analyze existing setup (read-only when .claude/ exists)
node ./bin/kyos.js --apply      # Create-only: write missing managed files, never overwrite
node ./bin/kyos.js --update     # Force-rewrite .kyos/ to current baseline (destructive to .kyos only)
node ./bin/kyos.js --doctor [--fix]      # Report (or repair) managed-file drift
node ./bin/kyos.js --add <type> <name>   # Add capability (skill/agent/hook)
```

The test runner (`test/run.js`) is a custom TAP-style harness with no name filter — it runs the full suite. To run a single case, temporarily narrow the registrations in `test/flow.test.js`.

## Architecture

### Two-Layer Model

- `.kyos/claude/` — **Managed layer**: generated files owned by the framework. Tracked via `.kyos/lock.json` (SHA256 checksums).
- `.claude/` — **Customization layer**: thin wrapper stubs pointing to managed files, plus repo-specific content. Never overwritten without user consent.

Changes to managed files are planned (create/update/conflict/blocked) before being applied, so the framework never silently destroys local edits.

### Module Map

`src/cli.js` is the entrypoint (`bin/kyos.js` just requires it): it parses flags and dispatches to `workflows.js`. Everything else lives in `src/core/`.

| File | Role |
|---|---|
| `src/cli.js` | Argument parsing; routes to `workflows.js` (`runBootstrap`/`runApply`/`runUpdateKyos`/`runDoctor`/`addCapability`) |
| `core/workflows.js` | All top-level operations: bootstrap, apply, update, doctor, add-capability, hook install |
| `core/managed-files.js` | Checksum-based diff/merge: `planManagedChanges()` → `applyManagedChanges()` |
| `core/fs.js` | Safe filesystem I/O; validates all paths against traversal/symlink attacks |
| `core/config.js` | Reads/writes `kyos.json` (repo-root, committable) and `.claude/settings.json` |
| `core/catalog.js` | Loads `catalog/registry.json` and looks up skills/agents/hooks |
| `core/json.js` | JSON read/write helpers |
| `core/hash.js` | SHA256 hashing for integrity checks |
| `core/constants.js` | All directory/file path constants |

### Bootstrap Flow (`workflows.js: runBootstrap`)

1. Reads `catalog/claude-base/` as the desired managed-file template.
2. Compares against `.kyos/lock.json` checksums to plan changes.
3. Writes managed files into `.kyos/claude/` and records new checksums.
4. Creates wrapper stubs in `.claude/` and seeds repo-owned templates (agents, skills, rules, commands folder).
5. Writes or updates `CLAUDE.md`.

### Managed Workflow Skills

Located in `catalog/claude-base/claude/skills/<name>/` (managed copies) and `.claude/skills/<name>/` (repo wrappers). Recommended delivery chain:

```
/spec → /tech → /tasks → /implement → /verify
```

Supporting skills: `/prevalidate`, `/architecture`, `/hire`. Each carries `disable-model-invocation: true`, so it behaves like a legacy slash command (typed explicitly via `/<name>`, never auto-invoked), plus an `agents/openai.yaml` sidecar so Codex respects the same explicit-only behavior. `.claude/commands/` remains a repo-owned folder for anything a repo wants to add itself, but does not hold the built-in flow.

An eleventh skill, `kyos-setup`, scaffolds and interactively populates the skill override layer (below). All eleven skills are also published for other harnesses via `.claude-plugin/marketplace.json` at the repo root, installable elsewhere with `npx skills add` (pass `--copy` so the install lands as a real file, not a symlink).

### Claude Plugin (`plugins/kyos/`)

A separate distribution for the Anthropic plugin directory (claude.ai chat, Cowork, Claude Code). It ships one guided `workflow` skill (spec → tech → tasks → implement) plus `hire`. Unlike the catalog skills, both are **model-invocable** (no `disable-model-invocation`), because chat has no `/name` invocation. Strictly explicit-only behavior stays with kyos-cli.

- **Hand-written:** `README.md` (the listing text), `skills/workflow/SKILL.md`, `skills/hire/SKILL.md`, `.claude-plugin/icon.png`, and every `plugin.json` field except `version`.
- **Generated by `scripts/build-plugin.js`:** `skills/*/references/*.md` (catalog skill bodies, frontmatter stripped), `LICENSE`, `plugin.json` `version` (from `package.json`).
- **Kept out of npm:** `plugins/` is not in `package.json` `files`, and bootstrap reads only `catalog/claude-base/`, so kyos-cli output is unaffected.
- **Release path:** `scripts/release.js` rebuilds the plugin before running tests. On a `v*` tag, the `promote-plugin` job in `publish.yml` force-moves the `plugin-release` branch to the tagged commit. The directory tracks that branch (plugin path `plugins/kyos`).

### Skill Override Layer

`.claude/skill-overrides/` holds per-repo overrides of skill defaults (e.g. where `spec`/`tech`/`tasks`/`implement`/`verify` save execution artifacts), keyed by skill name (`<name>.md`) plus a shared file (`_shared.md`) for cross-skill defaults. It lives outside every skill's own directory, so overrides survive both `kyos-cli --update` and `npx skills update`.

### Catalog (`catalog/registry.json`)

Defines available capabilities that can be added with `--add`. `--add` installs only what
the registry defines; an unknown name is rejected rather than scaffolded. Authoring a new
repo-specific skill or agent is `/hire`'s job.

- **Skills**: `critic`, `silent-execution`, plus the eleven workflow skills above (`spec`, `tech`, `tasks`, `implement`, `verify`, `prevalidate`, `architecture`, `hire`, `kyos-setup`).
- **Agents**: none. The catalog ships no agent definitions and `baseline.agents` is empty, so `--init` seeds no agents. `.claude/agents/` is created as an empty repo-owned folder with a README.
- **Hooks**: `repo-sandbox` — `PreToolUse` guard blocking tool calls whose paths resolve outside the repo root. Script sources live in `catalog/hooks/<name>/`. The installer copies the chosen runtime's script to `.claude/hooks/` and wires the event into `.claude/settings.json`.

Skills and agents are description-only registry entries: `--add` renders a stub from the
registry `description`. Only hooks ship executable sources under `catalog/hooks/`.

## Working Rules

- Treat `.kyos/claude/` as generated output — do not hand-edit it; edit the catalog baseline instead.
- Treat `.claude/` as the repo-owner's customization layer.
- Path safety is enforced in `fs.js`: all paths must be relative, no `..` segments, no symlinks escaping the repo root. Match this pattern for any new file I/O.
- `--force` with `--init` destructively resets `.claude/`, `.kyos/`, and `CLAUDE.md`. `--update` resets `.kyos/` only.
- Never hand-edit `plugins/kyos/skills/*/references/` or `plugins/kyos/LICENSE`. Edit the catalog skill, then `npm run build:plugin`. `npm test` fails on drift.
- Keep `plugins/kyos/` within directory rules: no `package.json`/lockfiles, no top-level `bin/`, no symlinks, the only image is `.claude-plugin/icon.png` (square PNG, 512–2048 px; keep it small, since the validator text-scans its bytes and holds the version on command-like strings such as `npx` even inside compressed pixels; full-size logo lives in `docs/assets/`), files ≤ 256 KiB, README ≥ 40 words. `npm run check:plugin` enforces these.
- Capability names are validated by `validateCapabilityName()` (alphanumeric, dots, underscores, dashes — no traversal patterns).
