#!/usr/bin/env bash
# SECRET-01 regression test — proves gitleaks actually scans docs/**/*.md.
#
# Creates a throwaway Markdown file under docs/ containing a synthetic secret
# that matches gitleaks' default AWS Access Key ID rule (never a real key),
# runs `gitleaks detect` against the working tree, and asserts it is caught.
# Removes the file afterwards regardless of outcome.
#
# Requires the `gitleaks` CLI in PATH (installed by security.yml's secret-scan
# job before calling this script; NOT installed by this script itself).
#
# Usage: bash scripts/test-gitleaks-docs-coverage.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/docs/__gitleaks_regression_test__.md"
# NOT AWS's canonical "AKIAIOSFODNN7EXAMPLE" placeholder: gitleaks' own default
# ruleset (config/gitleaks.toml, rule aws-access-token) carries a built-in
# rule-level allowlist regex `.+EXAMPLE$` that exempts exactly that value —
# it would never be flagged regardless of .gitleaks.toml, making it useless
# as a regression test. This value matches the same AKIA+16-char shape,
# has Shannon entropy ~4.0 (above the rule's threshold of 3 — computed and
# verified before use), and was hand-typed for this test only: never a real
# or provisioned credential, never reused anywhere else in this repo.
SYNTHETIC_SECRET="AKIA7Q2M9XZKPL4WYVBN"

cleanup() { rm -f "$TARGET"; }
trap cleanup EXIT

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "SKIPPED: gitleaks binary not found in PATH — cannot execute this regression test here."
  echo "  This test is meant to run in CI (.github/workflows/security.yml), where the"
  echo "  gitleaks-action installs the CLI. Locally, this is a pending/unverified check."
  exit 2
fi

cat > "$TARGET" <<EOF
# Gitleaks docs-coverage regression test (SECRET-01)

This file is created and deleted by scripts/test-gitleaks-docs-coverage.sh.
It exists only long enough for a single gitleaks scan to run against it.

Synthetic AWS key (never real, never valid): ${SYNTHETIC_SECRET}
EOF

echo "Rodando gitleaks contra o working tree (incluindo o segredo sintético em docs/)..."
gitleaks detect --source "$ROOT" --no-git -v
code=$?

if [ "$code" -eq 0 ]; then
  echo "FAIL — gitleaks NÃO detectou o segredo sintético em docs/ (a lacuna do SECRET-01 pode ter voltado)."
  exit 1
fi

echo "OK — gitleaks detectou o segredo sintético em docs/ (SECRET-01 permanece corrigido)."
exit 0
