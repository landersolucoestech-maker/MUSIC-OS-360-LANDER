---
name: prime
description: Loads the minimal relevant context package at the start of a task — operationalizes .claude/rules/context-memory.md's "load only what the current execution node needs" as an actual step instead of a principle nobody checks. Use before delegating to a specialist agent, or at the start of a session, to assemble exactly what's needed without dumping the whole repo.
---

# Prime

1. Read `.claude/engineering-os.json` (pack identity) and `.claude/project-manifest.json` (if it
   exists — the discovered stack) rather than re-deriving them.
2. Read only the specific rule files relevant to the task's domain (a frontend change primes
   `.claude/rules/architecture.md` + any per-project `frontend.md`, not the whole `rules/`
   directory).
3. Read `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` if the task touches naming/data fields at all.
4. Read current `.claude/ops/state.json` requirements/findings relevant to this specific task, not
   the full mission history.
5. Package the above into a `context-package` (`node .claude/runtime/context-engine.mjs open
   --agent <name> --objective "..." --files <comma-list>`) when delegating further, so the next
   agent inherits exactly this scoped context, not a re-derivation of it.
