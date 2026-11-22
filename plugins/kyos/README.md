# kyos

Turn an idea into working code with a guided spec, tech plan, task list and implementation.

kyos walks you through one feature at a time, in four stages. Each stage builds on the one before,
and you can stop, go back and revise, or jump in midway with a document you already have.

1. **Spec**: what the feature does, written from the user's point of view, with open questions marked plainly.
2. **Tech**: how to build it: moving parts, interfaces, risks and assumptions.
3. **Tasks**: small, ordered work slices, each with a clear way to check it's done.
4. **Implement**: the code, slice by slice, with progress tracked against the tasks.

A separate **hire** skill turns a repeatable job into a new skill, or, inside a project, finds the
skills and tools that project is missing.

## How to use it

- **Claude chat:** just ask, for example "help me plan a feature that lets users import CSV files".
  Each stage's result arrives as a file in the conversation (`spec.md`, `tech.md`, `tasks.md`) that
  you can preview and download, and Claude offers the next stage.
- **Cowork and Claude Code:** ask in plain language, or type `/kyos:workflow` (optionally with a stage
  and topic, like `/kyos:workflow tasks csv-import`) or `/kyos:hire`. With a project folder open,
  results are saved to `docs/execution/<feature>/spec.md`, `tech.md` and `tasks.md`, and implement
  edits the project's files.

## kyos plugin or kyos-cli?

This plugin starts on its own when you talk about planning or building a feature. If you prefer
skills that run only when you type them, use [kyos-cli](https://github.com/ajesskit/kyos)
in your repository instead (see its README for setup): it installs the same stages as explicit
`/spec`, `/tech`, `/tasks` and `/implement` commands. If a repository already has kyos-cli set up,
you don't need this plugin there.

## Data

This plugin contains only Markdown and JSON instructions. It runs no scripts, hooks or MCP servers,
makes no network requests, and stores nothing. Files are written only to the project folder you have
open, and only when you use the workflow there.

## License

MIT. See [LICENSE](LICENSE).
