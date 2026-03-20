#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-hooks.sh — Install git hooks for this repo.
# Run once after cloning: ./scripts/setup-hooks.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Installing git hooks..."

# Make scripts executable
chmod +x "$ROOT/scripts/local-check.sh"
chmod +x "$ROOT/.githooks/pre-push"

# Tell git to use .githooks/ as the hooks directory
git config core.hooksPath .githooks

echo "✓ Git hooks installed. pre-push will run tests before every push."
echo ""
echo "  To run checks manually: ./scripts/local-check.sh"
echo "  To skip hooks once (emergency): git push --no-verify"
