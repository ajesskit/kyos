# Path Safety Skill

Use this skill when code constructs repo paths from user-controlled values or merges path fragments into write targets.

## What to check

- whether user input can escape the intended repo root
- whether normalized or resolved paths are validated after joining
- whether writes are restricted to approved subdirectories
- whether file creation helpers assume trusted input when they should not

## Typical fixes

- validate names against a safe pattern before using them in paths
- resolve the final absolute path and confirm it stays under the allowed root
- reject path separators, `..`, absolute paths, and device names in user-controlled identifiers

## In this repo

Pay close attention to:

- `src/core/fs.js`
- `src/core/workflows.js`
- any future commands that create files from prompt arguments
