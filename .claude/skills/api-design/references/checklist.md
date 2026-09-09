# API Design Checklist

- [ ] HTTP method matches semantics (GET has no side effects and is cacheable; POST/PUT/PATCH/
      DELETE match create/replace/partial-update/remove — don't use POST for everything).
- [ ] Status codes match the actual outcome (201 on create, 204 on empty success, 4xx for client
      error with a specific code per error type, not a blanket 400/500).
- [ ] Error response shape is consistent with every other endpoint in the project (same envelope,
      same field names) — check an existing endpoint's error shape before inventing a new one.
- [ ] Pagination/filtering/sorting parameter names match existing endpoints' conventions exactly.
- [ ] Breaking-change risk: if this replaces/changes an existing endpoint's shape, is there a
      deprecation/versioning plan, or is this genuinely new and can't break anyone?
- [ ] Request validation happens server-side regardless of what the client already validates.
- [ ] Response includes only what the consumer needs — not the full internal entity by default.
- [ ] Naming matches `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` for every field that maps to an existing concept.
