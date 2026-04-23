# /kyos:architecture

> Pin down the technical shape of the repo so later planning is built on decisions instead of vibes.

## Core question

What are we actually building on, and where are the boundaries?

This command is for answering that question in repo terms:

- application layers
- storage choices
- integration points
- deployment model
- testing and operational expectations

## Best moment to use it

Use it when the repo feels technically underdefined or technically conflicted.

Typical cases:

- a greenfield repo needs a first-pass direction
- old stack decisions are becoming expensive
- docs and code imply different architectural stories
- upcoming work depends on choosing one path rather than keeping five options half-open

## Deliverable

The output should be a usable architecture note, not a generic manifesto.

It should leave behind:

- clearer repo-level technical decisions in `.claude/commands/project-context.md`
- explicit choices where the repo needs them
- known tradeoffs and risks written down in plain language
- a short note on whether current specialists and tooling are enough

## Questions to settle

Claude should push toward concrete answers in areas like:

- where UI, API, workers, and background processes live
- how data is stored and how state moves through the system
- which external services are first-class dependencies
- how the system is deployed, observed, and validated
- which parts are decided versus still provisional

## Style rules

- start from the repo as it exists today
- avoid turning this into feature planning
- avoid hiding uncertainty behind generic "best practice" phrasing
- when there are tradeoffs, name them directly
- when a decision is provisional, say that clearly

## Interaction rules

- treat this as a guided interview: ask one question at a time until decisions are explicit and shared
- walk the design tree depth-first, resolving prerequisite decisions before downstream choices
- for each question, include your recommended answer (plus a brief rationale) and wait for confirmation
- if a question can be answered by inspecting the repo, explore the codebase/config first instead of asking

## Example prompts

```text
/kyos:architecture
/kyos:architecture choose a backend and deployment model for a small SaaS
/kyos:architecture split this repo into app, worker, and shared data responsibilities
```

## What a good response looks like

A good result should leave a reader able to answer:

- what the stack is
- why those choices were made
- where the risky edges are
- what support is missing around that stack

If new stack areas appear that the repo is not equipped for, point to `/kyos:hire`.

## Where to save the result (so it can be committed)

Once the architecture direction is agreed, write the accepted summary into a repo-owned markdown file and commit it.

Recommended default:

- `docs/execution/architecture.md` (task-facing architecture note intended to be committed)

Optional additions (if helpful):

- `docs/architecture/overview.md` for a longer-lived narrative architecture overview
- `docs/architecture/diagrams/` for diagrams and supporting assets
- `docs/adr/` for small, dated decision records (ADRs)
