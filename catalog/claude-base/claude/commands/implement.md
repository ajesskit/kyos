# /kyos:implement

> Move the feature forward in small verified slices, using the available specialists and repo context without losing the plan.

## Purpose

Use this to carry a feature from technical plan into real code changes while keeping progress visible.

Typical outcomes:

- one or more completed implementation slices
- updated progress notes
- a short status report with done, next, and blocked items

## Inputs

- feature context
- technical plan
- current repo state
- available specialists, skills, and MCPs

## Workflow

1. Identify the next meaningful slice of work.
2. Load the feature and technical context before touching code.
3. Choose the best available specialist coverage for the slice.
4. Execute the slice and verify it locally when possible.
5. Record progress and move to the next slice if appropriate.
6. Stop clearly when blocked instead of hiding uncertainty.

## Guardrails

- Prefer vertical slices over giant code dumps.
- Keep implementation tied to the agreed feature and plan.
- Report progress explicitly.
- Verify whenever the repo allows it.

## Example prompts

```text
/kyos:implement
/kyos:implement finish the current feature
/kyos:implement handle only the auth callback and session persistence slice
```

## Claude behavior

When using this command, Claude should:

1. Review the feature and technical context.
2. Select the next concrete slice.
3. Implement and validate that slice.
4. Update the progress state.
5. Report what changed, what remains, and what is blocked.

## Next in flow

Continue with [`/kyos:verify`](./verify.md) once the implementation slice is ready to be checked.

