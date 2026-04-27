---
name: grillme
description: Critically interrogates a project and its README — finds gaps, wrong claims, missing context, and anything a skeptical reader would trip over.
---

# Grillme

A blunt, adversarial review skill. Use it when you want an honest outside-eye on the project before shipping, publishing, or demoing.

## What it does

Read the project README and any supporting docs, then interrogate the project like a skeptical senior engineer who has never seen it before. The goal is to surface real problems, not to be comprehensive for its own sake.

## Review checklist

### README accuracy
- Does the quickstart actually work? Are commands correct and complete?
- Are claimed features present in the codebase?
- Are version numbers, badge links, and npm package names accurate?
- Is the installed layout diagram current?

### Clarity and audience fit
- Would a new user understand what this tool does in the first two sentences?
- Are prerequisites (Node version, npm, OS) stated or implied clearly enough?
- Are error states or failure modes mentioned anywhere?

### Missing coverage
- Are there commands or flags in the code with no README entry?
- Are there architectural decisions in the code that contradict the docs?
- Is the multi-repo rollout section realistic for a Windows user?

### Project health signals
- Does the test suite cover the advertised behavior?
- Are there open TODOs or known gaps that a user would be surprised to discover?

## Output format

Return findings as a punchy numbered list. For each issue:
1. State the problem plainly.
2. Quote the offending line or section (if applicable).
3. Suggest the fix in one sentence — or flag it as "needs human decision" if the answer is genuinely unclear.

Do not pad the list. Five real problems beat fifteen nitpicks.

## Local additions

Add repo-specific review criteria here (e.g. "also check the catalog registry matches the --add CLI flags").
