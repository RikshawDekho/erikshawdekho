# ErickshawDekho — Claude Code Rules

## MANDATORY: Branching Workflow

Every fix or feature MUST follow this pipeline in order. No exceptions.

```
develop → fix/* or feature/* → develop → build/* → staging → release/* → main
```

### Step-by-step

1. **Start from develop**
   ```bash
   git checkout develop && git pull origin develop
   ```

2. **Create a fix or feature branch**
   ```bash
   git checkout -b fix/short-description     # for bug fixes
   git checkout -b feature/short-description # for new features
   ```

3. **Make changes, verify locally**
   ```bash
   ./scripts/local-check.sh   # must pass before committing
   ```

4. **Commit and push the branch**
   ```bash
   git push origin fix/short-description
   ```

5. **Merge into develop** (only after local-check passes)
   ```bash
   git checkout develop
   git merge fix/short-description --no-ff -m "merge: <description>"
   git push origin develop
   ```

6. **Create a build branch from develop**
   ```bash
   git checkout -b build/YYYY-MM-DD
   git push origin build/YYYY-MM-DD
   ```

7. **Merge build into staging** (triggers staging deploy + CI)
   ```bash
   git checkout staging
   git merge build/YYYY-MM-DD --no-ff -m "staging: <description>"
   git push origin staging
   ```

8. **Run smoke + sanity tests** against localhost (or staging env)

9. **Create a release branch from staging**
   ```bash
   git checkout -b release/YYYY-MM-DD-description
   git push origin release/YYYY-MM-DD-description
   ```

10. **Run regression + integration tests**
    ```bash
    ./scripts/local-check.sh
    ```

11. **If all tests pass**, wait for user to approve merge to main.
    **NEVER merge to main without explicit user instruction.**

12. **After main merge**, sync staging and develop:
    ```bash
    git checkout staging && git merge main && git push origin staging
    git checkout develop && git merge main && git push origin develop
    ```

---

## MANDATORY: Test Requirements

Before any push, ALL of the following must pass:

| Check | Command | What it catches |
|---|---|---|
| Django system check | `python manage.py check` | Model/config errors |
| Backend tests (18 tests) | `python manage.py test api` | Regressions in user flows |
| Frontend build | `npm run build` (in frontend/) | JS import errors, dead code |

Run all at once:
```bash
./scripts/local-check.sh
```

### When to add a new test

Add a regression test EVERY TIME a bug is fixed. The test must:
- Reproduce the bug (fail without the fix)
- Pass with the fix
- Cover the full user journey, not just the API endpoint

Minimum test coverage required for every PR:
- [ ] New vehicle is visible in marketplace after being added
- [ ] Admin settings are reflected in platform settings
- [ ] Plan limits are enforced correctly

---

## MANDATORY: Before Touching Any Model

1. **Read the model's `save()` method** — it may override fields you're setting
2. **Check all field defaults** — a default of `0` or `""` may have unintended effects
3. **Check all `pre_save`/`post_save` signals** in `signals.py` if it exists
4. **Write the migration** and run it locally before committing

---

## MANDATORY: Before Touching Any Frontend Component

1. **Read the component** fully before editing
2. **Check which API endpoint it reads from** and what fields it expects
3. **Use `??` (nullish coalescing) not `||` (falsy)** when falling back from API values
   — empty string `""` from the API should NOT fall back to a default
4. **For any data that needs to be fresh**, never use module-level JS caches

---

## Production Infrastructure Checklist

Before declaring a feature "live", verify:

- [ ] `CLOUDINARY_URL` is set in Railway env vars (images survive redeploy)
- [ ] `DJANGO_SETTINGS_MODULE` is `erickshaw.settings.production` in Railway (not demo)
- [ ] `SECRET_KEY` is at least 32 chars in Railway env vars
- [ ] `ensure_plans` and `ensure_admin` run on every deploy (check railway.toml CMD)

---

## Project Stack Reference

- **Frontend**: React + Vite, inline styles, no external UI library
- **Backend**: Django REST Framework, SQLite (dev) / PostgreSQL (prod)
- **Auth**: JWT (SimpleJWT), tokens in localStorage
- **Images**: Cloudinary (must be configured in prod)
- **Hosting**: Railway (backend), Vercel (frontend)

## Key Files

- `frontend/src/App.jsx` — monolithic SPA (~7800 lines), dealer portal
- `frontend/src/pages/DriverLandingPage.jsx` — driver-facing homepage
- `frontend/src/pages/DriverMarketplacePage.jsx` — public vehicle browse
- `frontend/src/components/FooterNew.jsx` — footer (reads platform settings)
- `backend/api/models.py` — all Django models
- `backend/api/views.py` — all API views
- `backend/api/tests.py` — full test suite (DO NOT delete existing tests)

## Servers (local dev)

```bash
# Backend
source venv/bin/activate && python backend/manage.py runserver

# Frontend
cd frontend && npm run dev
```

Admin: username=`admin`, password=`admin1234`
