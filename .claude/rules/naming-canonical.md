# Canonical Naming and Single Source of Truth

One concept has exactly one canonical technical name and one authoritative data source. This
rule governs every naming/duplication finding raised anywhere in the system, not just UI text.

## The map is the only source of canonical names

`docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` (schema: `.claude/contracts/canonical-map-entry.schema.json`, produced by
the `canonical-naming` skill) is the single registry of concept -> database column -> application
identifier -> API field -> event/queue name -> PT-BR (or the project's real user-facing language)
display label -> legacy aliases. No agent may invent a canonical name independently of this map;
propose additions to it instead.

## Internal code vs. user interface

- Internal, technical, project-controlled code uses English, the canonical term from the map, and
  the correct case convention for its layer (snake_case in SQL, camelCase in TypeScript/JS, etc).
- Anything a human end user reads uses that project's real user-facing language, correctly
  accented/spelled, humanized — never a raw enum value, snake_case key, or internal identifier
  leaked into a label, toast, or error message.
- Enum/status values keep a stable technical `VALUE` distinct from its display label; the mapping
  lives in the canonical map, not scattered per-component.

## One data field, one source of truth

Two fields that can independently drift for the same concept (a duplicate flag, a cached copy, a
legacy alias column still being written) are a finding, not a stylistic nit. Resolve by declaring
one field canonical in the map, migrating writers/readers to it, and giving the other an explicit
disposition (`HISTORICO_MIGRATION`, `DADO_HISTORICO`, or scheduled removal) — never leave both live
without an explicit fallback/sync contract that is itself documented and owned.

## One business rule, one authoritative implementation

The same business rule (a validation, a pricing/royalty calculation, an eligibility check)
implemented independently in more than one layer (controller and frontend and worker, for example)
is a finding unless there is a written architectural reason (e.g. an intentionally duplicated
client-side UX pre-check backed by a server-side authoritative check — which is fine as long as the
server check is the one that is actually authoritative and cannot be bypassed).

## No permanent scaffolding disguised as a fix

None of the following closes a finding: a fallback that masks the real error, an empty catch
block, an unchecked type-escape, a default value invented to avoid handling a real state, an alias
kept "forever" instead of migrated, dead code kept "just in case", an abandoned feature flag, a
permanent TODO, or a test loosened until it passes. These get recorded as findings with an explicit
disposition (see `evidence-governance.md` and `.claude/contracts/finding.schema.json`), not quietly
tolerated.
