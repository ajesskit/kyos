# /kyos:spec

> Capture a feature in user language before discussing tables, endpoints, or framework details.

## Purpose

Use this command to turn an idea into a focused behavior spec with clear success conditions.

Typical outcomes:

- a single-feature planning note
- user-facing requirements
- acceptance criteria
- clearly marked unanswered questions

## Inputs

- current project priorities
- `CLAUDE.md`
- `.claude/commands/project-context.md`
- any nearby product or design notes

## Workflow

1. Pick one feature or slice of work.
2. Gather what is already known.
3. Write the behavior from the user’s point of view.
4. Push on ambiguity with concrete follow-up questions.
5. Mark unresolved parts plainly instead of inventing certainty.
6. Translate the result into testable acceptance criteria.

## Guardrails

- Stay out of implementation detail.
- Keep the scope narrow.
- Prefer clarity over placeholder fluff.

## Example prompts

```text
/kyos:spec
/kyos:spec add GitHub OAuth sign-in
/kyos:spec let users upload CSV files and preview validation errors before import
```

## Claude behavior

When using this command, Claude should:

1. Restate the feature in plain language.
2. Ask for any missing user-facing detail.
3. Draft a concise but specific functional spec.
4. Mark unresolved questions explicitly.
5. Save the result into a local planning note.

## Next step

Run `/kyos:tech` to turn the feature behavior into an engineering approach.
