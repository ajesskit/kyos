# /kyos:release

> Full end-to-end release — bumps version on a release branch, opens and merges a PR to main, then creates a GitHub Release to trigger npm publish.

## Usage

```text
/kyos:release           # patch bump (default)
/kyos:release patch
/kyos:release minor
/kyos:release major
```

## Steps

Execute each step in order. Stop and report to the user if any step fails.

### 1. Resolve bump type

Use the argument if provided (`patch`, `minor`, or `major`). Default to `patch`.

### 2. Assert prerequisites

- `gh` CLI is authenticated: `gh auth status`
- The repo has a remote named `origin`
- `npm` and `node` are available

### 3. Ensure clean working tree

Run `git status --porcelain`. If the output is non-empty, stop and tell the user to commit or stash changes first.

### 4. Switch to a release branch

```bash
git checkout main && git pull
git checkout -b release/prep
```

If a `release/prep` branch already exists, delete it first:
```bash
git branch -D release/prep
```

### 5. Dry-run to preview

```bash
node scripts/release.js <bump> --dry-run
```

Report the planned version bump and commits to the user.

### 6. Run the release script

```bash
node scripts/release.js <bump>
```

This bumps `package.json`, updates `catalog/registry.json` and `CHANGELOG.md`, regenerates the lockfile, runs all tests, commits, and creates a version tag on the release branch.

If tests fail, stop here and report the failures.

### 7. Push release branch and tag

```bash
git push -u origin release/prep
git push origin <tag>   # e.g. git push origin v1.2.3
```

### 8. Open PR to main

```bash
gh pr create \
  --base main \
  --title "chore: release <version>" \
  --body "Automated release PR for <version>.

## What changed
<paste the CHANGELOG entry for this version>

## Checklist
- [x] Tests pass
- [x] Version bumped in package.json
- [x] CHANGELOG updated
- [x] Tag pushed"
```

### 9. Merge the PR

```bash
gh pr merge --merge --delete-branch
```

Wait for the merge to complete, then confirm with `gh pr view`.

### 10. Sync main locally

```bash
git checkout main && git pull
```

### 11. Create the GitHub Release

```bash
gh release create <tag> \
  --title "<tag>" \
  --notes "<CHANGELOG entry for this version>" \
  --latest
```

This triggers the `Publish` GitHub Actions workflow which publishes to npm with provenance attestation.

### 12. Confirm publish

```bash
gh run list --limit 5
```

Report whether the Publish workflow is running or completed. Give the user the npm package URL.

## What Claude should return

At the end, summarize:
- the new version number
- the merged PR URL
- the GitHub Release URL
- the Publish workflow status (running / succeeded / failed)

## Next steps

If the Publish workflow fails, the user can re-trigger it by re-running the workflow via `gh run rerun <run-id>` or by re-creating the GitHub Release.
