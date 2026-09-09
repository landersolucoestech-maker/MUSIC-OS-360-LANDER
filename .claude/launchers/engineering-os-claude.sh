#!/usr/bin/env bash
# Cross-platform (POSIX) launcher: validates the pack install is healthy, then
# starts Claude Code in this project's context. Named generically
# ("engineering-os-claude", not a specific product) since this pack installs
# into arbitrary projects — see docs/ARCHITECTURE.md's genericity requirement.
set -euo pipefail

# 1. Detect root: the directory containing .claude/engineering-os.json, walking
# up from cwd, since the launcher may be invoked from a subdirectory.
find_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.claude/engineering-os.json" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

ROOT="$(find_root)" || {
  echo "engineering-os-claude: no .claude/engineering-os.json found in this directory or any parent." >&2
  echo "Install the pack first: node <pack-path>/installer/install.mjs --target=." >&2
  exit 1
}
cd "$ROOT"

command -v node >/dev/null 2>&1 || {
  echo "engineering-os-claude: node is not on PATH. Install Node.js >= 18 first." >&2
  exit 1
}

# 2. Validate installation: doctor.mjs fails loudly and specifically instead of
# letting a broken/partial install surface as a confusing downstream error.
if ! node .claude/runtime/doctor.mjs > /tmp/eos-doctor.$$.json 2>&1; then
  echo "engineering-os-claude: doctor check FAILED — the pack install at $ROOT is unhealthy:" >&2
  cat /tmp/eos-doctor.$$.json >&2
  rm -f /tmp/eos-doctor.$$.json
  exit 1
fi
rm -f /tmp/eos-doctor.$$.json

# 3. Validate manifest (registry: every agent/skill frontmatter is valid and
# within its capability ceiling).
if ! node .claude/runtime/registry.mjs > /tmp/eos-registry.$$.json 2>&1; then
  echo "engineering-os-claude: registry validation FAILED — an agent/skill is malformed or exceeds its capability ceiling:" >&2
  cat /tmp/eos-registry.$$.json >&2
  rm -f /tmp/eos-registry.$$.json
  exit 1
fi
rm -f /tmp/eos-registry.$$.json

# 4. Start Claude Code in this project's context, if it's installed; otherwise
# tell the user exactly what's missing instead of failing silently.
if command -v claude >/dev/null 2>&1; then
  exec claude "$@"
else
  echo "engineering-os-claude: pack validated OK at $ROOT, but the 'claude' CLI is not on PATH." >&2
  echo "Install Claude Code, then re-run this launcher from $ROOT." >&2
  exit 1
fi
