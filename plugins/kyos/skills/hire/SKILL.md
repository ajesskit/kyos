---
name: hire
description: Create a new skill or fill gaps in a project's Claude setup. Use when the user wants to turn a repeatable task or workflow into a skill, teach Claude a convention, or asks what skills, agents or MCP servers their project is missing.
argument-hint: "[what the new skill should do]"
---

# kyos hire

Give Claude the support it is missing: a new skill for a repeatable job, or, inside a project, the
skills, agents and MCP servers that project needs.

## Pick the mode

- **Repo mode:** the user's own project is open (Claude Code, or Cowork with a folder the user
  selected). Read `references/repo-mode.md` and follow it.
- **Chat mode:** anything else, including claude.ai chat where files you create live in your own
  sandbox. Follow the steps below.

## Chat mode

1. **Understand the job.** Ask what the skill should do, when it should be used, what a good result
   looks like, and one or two real examples. Ask only what you can't infer; at most three questions
   at a time.
2. **Draft the skill folder** and deliver it in the same reply as something the user can download from
   this conversation, ideally a `<skill-name>.zip`, otherwise the individual files. Never just name a
   path in your own sandbox. The folder holds:
   - `<skill-name>/SKILL.md` with frontmatter:
     - `name`: lowercase letters, digits and hyphens; matches the folder name
     - `description`: one line saying what it does **and when to use it**, written as the
       situations the user will be in, since this decides when Claude picks the skill
   - a body with the steps, defaults, and what good output looks like, kept under about 500 lines
   - optional `references/` files for long detail, each mentioned from `SKILL.md`
3. **Check it** against the examples the user gave: walk through one and show what the skill would
   make Claude do. Adjust if it misses.
4. **Explain how to install it:** zip the `<skill-name>` folder and add it in Claude under
   **Customize → Skills** (or bundle it in a plugin and use **Customize → Plugins → Add → Upload plugin**).

Keep the skill focused on one job. If the user describes several, suggest one skill each.
