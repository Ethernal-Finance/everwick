# Everwick AI Collaboration Rules

This repository is actively worked on by multiple AI coding agents and humans.

All agents must read this file before making changes.

## Source of Truth

- The active repository is this Git repository.
- The primary branch is `main`.
- During the current build phase, changes may be deployed directly to the live Everwick environment.
-s Do not create alternate branches unless explicitly requested.
- Do not treat `/opt/everwick` or other deployment copies as the authoritative source unless specifically instructed.

## Commit Rules

Every meaningful change must be committed.

Before making a significant change:

1. Run `git status`.
2. Review any existing uncommitted changes.
3. Do not overwrite or discard work created by another agent unless explicitly instructed.
4. If unrelated changes already exist, preserve them.

After completing a coherent change:

1. Run relevant tests.
2. Review `git diff`.
3. Commit the change.
4. Use a clear commit message describing what changed.

Examples:

- `fix: prevent duplicate citizen creation`
- `feat: add housing placement validation`
- `ui: improve world map controls`
- `test: add regression coverage for fishing`
- `docs: update deployment notes`

Avoid vague commit messages like:

- `changes`
- `update`
- `fix stuff`
- `ai edits`

## Commit Scope

Keep commits focused.

One commit should represent one logical unit of work whenever practical.

Do not combine unrelated changes into a single commit.

Do not rewrite, squash, amend, or force-push another agent's commits unless explicitly instructed.

## Before Editing
## Source of Truth — CRITICAL

GitHub is the 100% authoritative source of truth for Everwick.

Canonical repository:

`Ethernal-Finance/everwick`

Canonical branch:

`main`

The VPS filesystem is NOT the source of truth.

`/opt/everwick-work/everwick` is a working checkout of the GitHub repository.

`/opt/everwick` is a deployment/runtime location and must never be treated as authoritative source code.

### Required Rule

Every source-code change must follow this order:

1. Start from the latest `origin/main`.
2. Make the change in the Git working copy.
3. Test the change.
4. Commit the change.
5. Push the commit to GitHub.
6. Deploy the committed GitHub version to live.

A change that exists only on the VPS is NOT considered part of Everwick.

Do not make permanent fixes directly inside `/opt/everwick`.

Do not deploy uncommitted source code.

Do not deploy a commit that has not been pushed to GitHub.

GitHub must always contain the exact source needed to reproduce the live application.

If the VPS and GitHub disagree, GitHub wins unless a human explicitly states otherwise.
Always inspect the existing implementation before replacing it.

Search for:

- imports
- route usage
- client references
- tests
- documentation
- configuration
- deployment dependencies

Preserve existing behavior unless the requested task requires changing it.

## Working With Other Agents

Assume another AI or human may have changed the repository recently.

Before starting work, run:

git status
git log --oneline -10
git fetch origin

Do not blindly reset the working tree.

Do not use destructive commands such as:

git reset --hard
git clean -fd
git checkout -- .
git restore .

unless explicitly instructed and the consequences are understood.

## Existing Uncommitted Changes

If files are already modified:

- inspect the diff
- determine whether the changes belong to another task
- preserve them unless they directly conflict
- do not silently revert them

## Secrets

Never commit secrets.

Keep these out of Git:

- `.env`
- `.env.*` except `.env.example`
- private keys
- API credentials
- database credentials
- production secrets
- Stripe secret keys
- webhook secrets

Do not copy real secrets into documentation, tests, or examples.

## Generated and Runtime Data

Do not commit generated/runtime directories unless explicitly required.

Examples:

- `node_modules/`
- `dist/`
- `data/`
- logs
- temporary files
- coverage output

Respect `.gitignore`.

## Testing

Run relevant tests during development.

Before considering a significant change complete, run when practical:

npm test

Do not claim tests passed unless they actually ran successfully.

## Build

When a change affects generated output, verify:

npm run build

Do not manually edit generated `dist/` output as the primary implementation.

Change the source and rebuild instead.

## Live Environment

Everwick is currently in an active build phase.

Changes may reach the live environment quickly.

Therefore:

- avoid destructive database changes
- preserve backward compatibility when practical
- validate changes before deployment
- create a commit checkpoint before risky work
- keep rollback possible

## Database and Data Safety

Do not delete, reset, or rewrite production data unless explicitly instructed.

Prefer additive and reversible migrations.

## Documentation

If a change materially alters architecture, deployment, APIs, economics, gameplay systems, or operational behavior, update the relevant documentation.

## Handoff Notes

For larger tasks, leave enough context for the next agent to understand:

- what changed
- why it changed
- files involved
- tests run
- known issues
- remaining work

## Golden Rule

Do not leave the repository in a state that is harder for the next agent to understand than when you found it.

Preserve work.
Commit coherent changes.
Document important decisions.
Keep the repository recoverable.
