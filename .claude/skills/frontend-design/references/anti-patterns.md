# Frontend Design Anti-Patterns

- **Designing only the happy path**: no thought given to loading/empty/error states until a
  reviewer asks "what does this look like with zero items?"
- **Inventing a new interaction pattern for something the app already solves**: a new confirmation-
  dialog style, a new table-filter layout, when an existing pattern already covers the case.
- **Raw enum/status values used as placeholder copy**: designing with `status: "PENDING_REVIEW"`
  visible in a mockup and shipping it unchanged because "we'll fix the copy later."
- **Accessibility as an afterthought**: no consideration of keyboard flow or contrast until
  `accessibility-reviewer` flags it post-implementation, when it's more expensive to retrofit.
- **A destructive action with no confirmation designed in** — added only after a reviewer catches
  it, rather than being part of the interaction design from the start.
- **Assuming a single breakpoint**: designing only for desktop width and treating mobile/tablet as
  "should just reflow," without checking the project's actual target breakpoints.
