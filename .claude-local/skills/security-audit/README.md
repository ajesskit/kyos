# Security Audit Skill

Use this skill when reviewing the repo for practical security issues rather than style or architecture drift.

## Focus areas

- path traversal and unsafe filesystem writes
- command execution boundaries
- MCP registration and remote tool trust
- secrets handling and config hygiene
- supply-chain exposure from `npx`, remote endpoints, and dependency choices

## Review style

- prioritize exploitable behavior over theoretical concerns
- prefer concrete abuse paths
- include the user-controlled input that triggers the issue
- recommend the narrowest safe fix first

## Expected outputs

- findings ordered by severity
- file and line references
- a short remediation plan
