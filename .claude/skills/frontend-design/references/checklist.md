# Frontend Design Checklist

- [ ] Loading, empty, and error states are designed explicitly, not left as "add later."
- [ ] Every raw technical value the screen will show (enum, status, date) has a resolved
      humanized label in `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md`, or a plan to add one via
      `canonical-naming` before implementation.
- [ ] The design follows an existing navigation/layout pattern already used elsewhere in the app,
      or states explicitly why this screen needs a new one.
- [ ] Keyboard/focus flow for new interactive elements is considered at design time, not left
      entirely to `accessibility-reviewer` to discover post-hoc.
- [ ] Destructive actions have a confirmation step designed in, not bolted on after review.
- [ ] Responsive behavior across the project's actual target breakpoints is part of the design,
      not assumed to "just work."
