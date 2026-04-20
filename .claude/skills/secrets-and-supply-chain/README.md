# Secrets And Supply Chain Skill

Use this skill when reviewing how the repo handles external tooling, credentials, and package execution.

## What to inspect

- `npx`-based execution paths
- remote URLs embedded in config
- credential placeholders and header-based auth
- whether generated docs encourage unsafe secret handling

## Red flags

- executing remote tools without making the trust boundary clear
- suggesting inline secrets in checked-in config
- undocumented third-party access to repo contents
- confusing local development examples that hide network execution

## In this repo

Review:

- `catalog/registry.json`
- `.mcp.json`
- `README.md`
- generated command guidance in `.claude/` and `.kyos/claude/`
