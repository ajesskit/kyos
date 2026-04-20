# MCP Hardening Skill

Use this skill when adding or reviewing MCP integrations.

## What to inspect

- remote MCP endpoints and their trust boundaries
- whether local or remote MCPs need auth headers or scoped credentials
- whether adding an MCP changes the repo's effective data exposure
- whether MCP configuration is being merged safely

## Questions to answer

- is the MCP local, remote, or shell-backed
- what data can it read or write
- what secrets or headers does it require
- should it be enabled by default for every repo

## In this repo

Review:

- `.mcp.json`
- `catalog/registry.json`
- `src/core/workflows.js`
