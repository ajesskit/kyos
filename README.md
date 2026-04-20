# agentic-framework-init

`agentic-framework-init` is a repository-local bootstrap tool for Claude Code repos.

Its intended flow is:

- run `npx agentic-framework-init`
- if the repo has no Claude setup yet, create a base `CLAUDE.md` and `.claude/` structure
- if the repo already has `.claude/` or `CLAUDE.md`, analyze what exists and propose safe updates
- run `npx agentic-framework-init --apply` only after reviewing the proposal

## Architecture

This follows the AWOS-style split from `provectus/awos`:

- the CLI handles deterministic mutations in `process.cwd()`
- the registry or catalog layer stays separate and discoverable

In this prototype, the catalog layer is represented by [catalog/registry.json](/d:/agentic-workflow/catalog/registry.json:1).

## Managed vs local files

Managed Claude assets are written into `CLAUDE.md` and `.claude/`. Repo-specific additions belong in `.claude-local/`. Framework state is tracked under `.agentic-framework/`.

Files are updated safely using `.agentic-framework/lock.json`:

- if a managed file still matches the last recorded checksum, it can be updated
- if a managed file was edited locally, the CLI reports a conflict and does not overwrite it
- if an unmanaged file already exists where a managed file would be written, the CLI reports it as blocked

## Default commands

```powershell
npx agentic-framework-init
npx agentic-framework-init --apply
npx agentic-framework-init analyze
npx agentic-framework-init doctor
```

## Installed layout

```text
CLAUDE.md
.claude/
  agents/
  commands/
  skills/
  settings.json

.claude-local/
  agents/
  commands/
  skills/

.agentic-framework/
  config.json
  version.json
  lock.json

.mcp.json
```

## Existing repo behavior

If a repo already contains `.claude/` or `CLAUDE.md`, the default command does not mutate files. It prints proposals such as:

```text
+ would add .claude/skills/README.md
~ would update .claude/settings.json
! CLAUDE.md (unmanaged file already exists with different content)
```

## Multi-repo rollout

Because the CLI runs only in the current working directory, you can apply it repo-by-repo from another script:

```powershell
$repos = @("D:\repo-a", "D:\repo-b", "D:\repo-c")
foreach ($repo in $repos) {
  Push-Location $repo
  npx agentic-framework-init
  Pop-Location
}
```

## Local development

```powershell
node .\bin\agentic-framework-init.js
node .\bin\agentic-framework-init.js --apply
node .\bin\agentic-framework-init.js add mcp filesystem
```
