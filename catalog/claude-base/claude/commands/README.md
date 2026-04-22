# Kyos Commands (Managed)

This folder is the framework-managed source for the built-in `/kyos:*` workflow commands.

In a bootstrapped repo:

- `.kyos/claude/commands/` contains these managed command definitions.
- `.claude/commands/` is the user-facing command entrypoint folder (seeded from the managed layer).

Recommended daily flow:

`/kyos:spec -> /kyos:tech -> /kyos:tasks -> /kyos:implement -> /kyos:verify`

If you’re new to the repo or about to run tooling/scripts, start with:

`/kyos:prevalidate`

