---
name: workflow
description: Guided feature workflow (spec, tech plan, task list, implementation). Use when the user wants to plan, scope, design, break down or build a feature or product change, or asks for a spec, technical plan or task list. Do not use for unrelated questions or quick one-off code edits.
argument-hint: "[spec|tech|tasks|implement] [feature or slug]"
---

# kyos workflow

Take one feature from idea to working code in four stages, one at a time:

1. **spec**: what the feature does, in the user's language
2. **tech**: how to build it
3. **tasks**: ordered, verifiable work slices
4. **implement**: the code

Each stage has a detailed guide in `references/`. Read the guide for the current stage before
doing that stage's work, and follow it, except where the rules below override it.

## Pick the stage

- If the user named a stage (e.g. `/kyos:workflow tech csv-import`, or "write the tech plan"), use it.
- Otherwise start from what already exists for this feature:
  - nothing yet → **spec**
  - a spec → **tech**
  - a spec and a tech plan → **tasks**
  - all three → **implement**
- If the user pasted or attached an earlier stage's document, treat it as done and start at the
  stage after it.
- Say which stage you are starting, in one line, before you begin.

## Run the stage

Read the matching guide:

| Stage | Guide |
|---|---|
| spec | `references/spec.md` |
| tech | `references/tech.md` |
| tasks | `references/tasks.md` |
| implement | `references/implement.md` |

### Rules that override the guides

**Where results go.** Decide once per conversation. What matters is whether you can write into **the
user's own project**, not whether you have file tools at all:

- **The user's project is open** (Claude Code, or Cowork with a folder the user selected): save each
  stage to `docs/execution/<slug>/<stage>.md` exactly as the guide says, keep the guide's **Related**
  links, and honor `.claude/skill-overrides/_shared.md` and `.claude/skill-overrides/<stage>.md` if
  they exist.
- **Anything else** (for example claude.ai chat, where any files you create live in your own sandbox
  that the user cannot open):
  - Deliver each stage as a file the user receives **in the same reply**: `spec.md`, `tech.md`,
    `tasks.md`. Use whatever this conversation offers for giving the user a file they can preview and
    download, such as a file attachment, a downloadable output or a document/artifact. If none is
    available, put the full document in your reply as Markdown.
  - Never tell the user a path like `docs/execution/...` or `/home/...`, and never say a file is
    "saved" unless the user can open it from this conversation right now.
  - Skip the guide's file-path, glob, "Related" and "Local additions" instructions.

**Moving on.** Ignore the guides' "Next steps" sections that name other skills. Use the handoff below
instead.

**Implement without the user's project.** Work through the tasks in order and deliver the code as files
the user receives in the conversation (complete files, or a downloadable archive for many files), the
same way as the stage documents. Never say that you edited, ran or tested anything you
could not access. End with what the user should run to check it.

**Specialist agents.** If the guide asks you to spawn agents and you cannot, do the work yourself.

## Hand off after every stage

End each stage with a short handoff:

- **Decided:** the two or three things this stage settled
- **Open:** anything still unresolved (or "nothing")
- **Next:** offer the next stage in one question, e.g. "Ready to turn this into a technical plan?"

Then wait. The user may:

- **continue:** run the next stage, building on every earlier stage's document
- **revise:** e.g. "revise the spec: drop export". Update that stage and say which later stages are
  now out of date
- **stop:** that's fine; summarize where things stand

After **implement**, the workflow is complete; offer a final check of the result against the spec's
outcomes.
