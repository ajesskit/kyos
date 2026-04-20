# kyos

This repository uses a shared Claude Code bootstrap managed by kyos.

## Working rules

- Treat `.kyos/claude/` as the managed source layer.
- Use `.claude/` as the repo-owned customization and override layer.
- Run `npx kyos --init` to install or analyze the base structure.
- Run `npx kyos --apply` after reviewing a proposal.
