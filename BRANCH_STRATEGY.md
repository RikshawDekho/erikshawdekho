# Branch Strategy

This repository uses a lightweight GitFlow-style model tuned to the existing CI workflows.

## Goals

- Keep production stable.
- Make staging predictable.
- Allow parallel feature development with low merge risk.
- Make releases and hotfixes auditable.

## Branch Roles

| Branch | Purpose | Deploy Behavior |
|---|---|---|
| `main` | Production-ready code only | Push triggers production workflow (`.github/workflows/deploy-production.yml`) |
| `develop` | Integration branch for upcoming release | Used as default target for feature PRs |
| `release/*` | Release hardening branch (staging candidate) | Push triggers staging workflow (`.github/workflows/deploy-staging.yml`) |
| `feature/*` | New functionality | PR into `develop` |
| `bugfix/*` | Non-production bug fixes for next release | PR into `develop` |
| `hotfix/*` | Urgent production fix | PR into `main`, then back-merge into `develop` |
| `chore/*`, `docs/*`, `refactor/*`, `test/*` | Non-feature scoped work | Usually PR into `develop` |

## Branch Naming Convention

Use lowercase kebab-case, with a short scope.

Examples:

- `feature/dealer-invoice-pdf`
- `bugfix/lead-status-filter`
- `hotfix/prod-auth-timeout`
- `chore/deps-python-3-11`
- `docs/release-playbook`

## Day-to-Day Development Flow

1. Branch from `develop`:
   - `git checkout develop`
   - `git pull origin develop`
   - `git checkout -b feature/<name>`
2. Commit in small, reviewable slices.
3. Open PR to `develop`.
4. Require passing checks before merge.
5. Prefer squash merge for noisy feature history.

## Release Flow

1. Create release branch from `develop`:
   - `git checkout develop && git pull origin develop`
   - `git checkout -b release/<version-or-date>`
2. Allow only release-focused changes on `release/*`:
   - bug fixes
   - configuration fixes
   - docs/changelog updates
3. Push `release/*`:
   - staging workflow runs automatically
   - staging deploy is triggered by CI
4. Validate on staging.
5. Open PR: `release/*` -> `main`.
6. Merge to `main` to trigger production deploy.
7. Back-merge `main` into `develop` immediately after release.

## Hotfix Flow

Use this only for urgent production issues.

1. Branch from `main`:
   - `git checkout main && git pull origin main`
   - `git checkout -b hotfix/<name>`
2. Implement minimal fix + tests.
3. PR to `main`.
4. After merge to `main`, merge/cherry-pick the same fix into `develop`.
5. If a release branch is open, apply the fix there too.

## Pull Request Rules

- No direct pushes to `main`.
- No direct pushes to long-lived `release/*` after approval window starts, except release manager.
- Every PR should include:
  - change summary
  - risk assessment
  - verification notes (manual and/or automated)
  - rollback plan for risky changes

## Environment Mapping

- `develop`: integration and pre-release stabilization.
- `release/*`: staging validation branch.
- `main`: production source of truth.

This matches existing workflows:

- Staging workflow: `.github/workflows/deploy-staging.yml`
- Production workflow: `.github/workflows/deploy-production.yml`

## Suggested Protections

Set these in repository settings:

- Protect `main`:
  - require PR
  - require CI success
  - block force push
- Protect `develop`:
  - require PR
  - require CI success
- Protect `release/*`:
  - require PR for merge to `main`
  - limit write access during release hardening

## Release Ownership

Assign one release manager per cycle to:

- cut `release/*`
- coordinate staging sign-off
- merge `release/*` into `main`
- ensure back-merge to `develop`
