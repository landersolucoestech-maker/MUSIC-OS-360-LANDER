---
name: frontend-design
description: Designs a new screen/component's interaction and layout before implementation — consistency with the project's existing navigation/component patterns, checked proactively rather than caught later by ui-ux-reviewer. Use when feature-planner needs a new UI surface designed, not for reviewing an already-built one.
---

# Frontend Design

1. Survey the project's existing screens/components for the pattern this new one should follow
   (navigation structure, form layout, table/list conventions, empty/loading/error state pattern) —
   a new screen should look like it belongs.
2. Design the states explicitly up front: loading, empty, error, and the populated/happy path — not
   just the happy path with states added later as an afterthought.
3. Identify every raw technical value (an enum, a status, a date) that will need a humanized label
   and check `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` for it before implementation starts (`ui-humanization`
   skill if the label doesn't exist yet).
4. Flag accessibility requirements up front (keyboard flow, focus order for a new interactive
   element) rather than leaving them for `accessibility-reviewer` to discover post-hoc.

## Output
A design ready for `implementation-engineer`: states enumerated, existing patterns identified to
follow, labels resolved. `ui-ux-reviewer`/`accessibility-reviewer` still review the built result —
this skill reduces what they find, it doesn't replace them.
