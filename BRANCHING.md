# Branching Strategy

## Branch Map

```
main          ← production  (Railway: production env)  PROTECTED
develop       ← staging     (Railway: staging env)     PROTECTED
feature/*     ← day-to-day work
fix/*         ← non-urgent bug fixes
hotfix/*      ← urgent production fixes
release/*     ← release prep (triggers staging deploy)
chore/*       ← deps, config, infra
```

## Workflows

### New Feature
```
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
# ... work ...
git push origin feature/my-feature
# Open PR: feature/my-feature → develop
```

### Bug Fix (non-urgent)
```
git checkout develop
git pull origin develop
git checkout -b fix/describe-the-bug
# ... fix ...
git push origin fix/describe-the-bug
# Open PR: fix/describe-the-bug → develop
```

### Hotfix (urgent — production is broken)
```
git checkout main
git pull origin main
git checkout -b hotfix/describe-the-issue
# ... fix ...
git push origin hotfix/describe-the-issue
# Open PR 1: hotfix/* → main        (deploys to production)
# Open PR 2: hotfix/* → develop     (keeps develop in sync)
```

### Release to Production
```
git checkout develop
git pull origin develop
git checkout -b release/YYYY-MM-DD
git push origin release/YYYY-MM-DD
# Open PR: release/YYYY-MM-DD → main
# After merge → Railway auto-deploys to production
```

## Rules (enforced via GitHub branch protection)

| Branch    | Direct push | Force push | Requires PR | CI must pass |
|-----------|-------------|------------|-------------|--------------|
| `main`    | ❌ Never    | ❌ Never   | ✅ 1 review  | ✅ Yes       |
| `develop` | ❌ Never    | ❌ Never   | ✅ 1 review  | ✅ Yes       |
| others    | ✅ OK       | ✅ OK      | —           | —            |

## Railway ↔ Branch Mapping

| Railway env | GitHub branch | Auto-deploy? |
|-------------|---------------|--------------|
| production  | `main`        | ✅ Yes (Wait for CI) |
| staging     | `develop`     | ✅ Yes (Wait for CI) |
| demo        | `develop`     | ✅ Yes (Wait for CI) |
