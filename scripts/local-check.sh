#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# local-check.sh — Run all checks locally before pushing / creating a PR.
#
# Usage:
#   ./scripts/local-check.sh          # run all checks
#   ./scripts/local-check.sh backend  # backend tests only
#   ./scripts/local-check.sh frontend # frontend build only
#
# This mirrors what CI (ci.yml) does so you catch failures locally first.
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/venv"
PASS=0
FAIL=0

green()  { echo -e "\033[32m$*\033[0m"; }
red()    { echo -e "\033[31m$*\033[0m"; }
yellow() { echo -e "\033[33m$*\033[0m"; }
bold()   { echo -e "\033[1m$*\033[0m"; }

check_step() {
  local name="$1"; shift
  echo ""
  bold "── $name ──────────────────────────────"
  if "$@"; then
    green "✓ $name passed"
    PASS=$((PASS + 1))
  else
    red "✗ $name FAILED"
    FAIL=$((FAIL + 1))
  fi
}

run_backend() {
  if [ ! -d "$VENV" ]; then
    red "Virtual env not found at $VENV. Run: python3 -m venv venv && pip install -r backend/requirements.txt"
    return 1
  fi
  source "$VENV/bin/activate"
  cd "$ROOT"
  python backend/manage.py test api --verbosity=1
}

run_frontend_build() {
  cd "$ROOT/frontend"
  if [ ! -d "node_modules" ]; then
    yellow "node_modules not found — running npm install..."
    npm install --silent
  fi
  VITE_API_URL=https://api.erikshawdekho.com/api npm run build -- --logLevel warn 2>&1 | grep -v "^$"
}

run_django_check() {
  source "$VENV/bin/activate"
  cd "$ROOT"
  python backend/manage.py check
}

MODE="${1:-all}"

bold "═══════════════════════════════════════"
bold " ErickshawDekho — Local Check"
bold " Branch: $(git branch --show-current)"
bold "═══════════════════════════════════════"

if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
  check_step "Django system check" run_django_check
  check_step "Backend tests (18 tests)" run_backend
fi

if [[ "$MODE" == "all" || "$MODE" == "frontend" ]]; then
  check_step "Frontend build" run_frontend_build
fi

echo ""
bold "═══════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  green "✓ All $PASS checks passed. Safe to push."
else
  red "✗ $FAIL check(s) failed, $PASS passed."
  red "  Fix the issues above before pushing."
  exit 1
fi
