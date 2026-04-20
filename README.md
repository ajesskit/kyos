# kyos

`kyos` is a repository-local bootstrap tool for Claude Code repos.

Its intended flow is:

- run `npx kyos --init`
- if the repo has no Claude setup yet, create a base `CLAUDE.md` and `.claude/` structure
- if the repo already has `.claude/` or `CLAUDE.md`, analyze what exists and propose safe updates
- run `npx kyos --apply` only after reviewing the proposal

## Architecture

This uses a split architecture:

- the CLI handles deterministic mutations in `process.cwd()`
- the registry or catalog layer stays separate and discoverable

In this prototype, the catalog layer is represented by [catalog/registry.json](/d:/kyos/catalog/registry.json:1).

## Managed vs local files

Managed Claude assets are written into `CLAUDE.md` and `.claude/`. Repo-specific additions belong in `.claude-local/`. Framework state is tracked under `.kyos/`.

Files are updated safely using `.kyos/lock.json`:

- if a managed file still matches the last recorded checksum, it can be updated
- if a managed file was edited locally, the CLI reports a conflict and does not overwrite it
- if an unmanaged file already exists where a managed file would be written, the CLI reports it as blocked

## Default commands

```powershell
npx kyos --init
npx kyos --apply
npx kyos --analyze
npx kyos --doctor
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

.kyos/
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
  npx kyos --init
  Pop-Location
}
```

## Local development

```powershell
node .\bin\kyos.js --init
node .\bin\kyos.js --apply
node .\bin\kyos.js --add mcp filesystem
```
