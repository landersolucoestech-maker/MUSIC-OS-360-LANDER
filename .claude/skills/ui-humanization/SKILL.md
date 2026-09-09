---
name: ui-humanization
description: Finds and fixes raw technical identifiers (enum values, snake_case/camelCase keys, ISO dates, internal status strings) leaking into user-facing text, replacing them with the humanized label from the canonical map in the project's real user-facing language. Use after ui-ux-reviewer flags a leaked identifier, or proactively during the frontend pass of a systemic audit.
---

# UI Humanization

Implements `.claude/rules/naming-canonical.md` §"Internal code vs. user interface".

## Method

1. Grep rendered UI code (components, templates, toast/notification strings, PDF/CSV export
   labels, email templates) for patterns that look like raw identifiers reaching the user: a
   value equal to an enum's technical key, `snake_case`/`camelCase` tokens in a rendered string,
   ISO 8601 dates rendered without formatting, or an error message containing an internal
   exception name.
2. For each hit, check `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` for the concept's `displayPtBr` (or the project's
   real user-facing language) label. If none exists yet, add one via the `canonical-naming` skill
   before fixing the UI — don't invent a label ad hoc in the component.
3. Replace the raw value with a lookup/mapping to the humanized label — keep the technical `VALUE`
   as the code's internal representation (used for logic/comparisons) and use the label only at
   the render boundary, so the two never get conflated into one field.
4. Prefer a single shared label-lookup mechanism (a map/dictionary keyed by the technical value)
   over duplicating the same enum-to-label switch statement in every component that renders it.

## Output

Fixed rendering plus a finding disposition (`CORRIGIDA`) for each leak found, or a
`docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` update if the label didn't exist yet.
