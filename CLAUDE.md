# kyos

This repository uses a shared Claude Code bootstrap managed by kyos-cli.

## Working rules

- Treat `.kyos/claude/` as the managed source layer.
- Use `.claude/` as the repo-owned customization and override layer.
- Run `npx kyos-cli --init` to install or analyze the base structure.
- Run `npx kyos-cli --apply` after reviewing a proposal.
