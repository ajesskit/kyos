# /kyos:tech

> Turn feature behavior into a build plan: moving parts, interfaces, data flow, failure modes, and implementation boundaries.

## Purpose

Use this after the feature intent is clear and before large code changes begin.

Typical outcomes:

- a technical plan for the target feature
- proposed interfaces, data structures, file boundaries, and operational considerations
- a note about new stack requirements that may need `/kyos:hire`

## Inputs

- the current feature description or spec
- `.claude/commands/project-context.md`
- the existing codebase

## Workflow

1. Identify the feature being designed.
2. Read the current architecture and inspect relevant code patterns.
3. Describe the implementation path in practical engineering terms.
4. Call out assumptions instead of hiding them.
5. Note interfaces, data flow, responsibilities, and risks.
6. Flag new technologies or domains that need extra specialist support.

## Guardrails

- This is a blueprint, not the final code.
- Stay grounded in the current repo where possible.
- Highlight risk and uncertainty early.

## Example prompts

```text
/kyos:tech
/kyos:tech use GitHub OAuth with secure session cookies and Redis session storage
/kyos:tech plan CSV import with validation pipeline, staging table, and background processing
```

## Claude behavior

When using this command, Claude should:

1. Load the feature context and inspect relevant code.
2. Draft a specific implementation approach.
3. Make assumptions visible and reviewable.
4. Point out risk, migration, or operational concerns.
5. Suggest `/kyos:hire` if the design introduces uncovered capabilities.

## Next in flow

Continue with [`/kyos:tasks`](./tasks.md) to break the plan into ordered execution slices.

## Where to save the result

Write the technical plan into a repo-owned markdown file so it can be reviewed and committed:

- `docs/execution/<spec-slug>/tech.md`

Use the same `<spec-slug>` chosen in `/kyos:spec` (the folder created under `docs/execution/`).
