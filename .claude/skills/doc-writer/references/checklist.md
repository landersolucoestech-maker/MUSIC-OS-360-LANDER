# Documentation Quality Checklist

- [ ] Every code example in the doc actually runs against the current codebase (verify, don't
      assume it still matches after the code changed).
- [ ] Every referenced file path, script name, and command actually exists — no invented/guessed
      names (`.claude/rules/testing.md`'s "never invent a script name" applies here too).
- [ ] Historical/superseded content is explicitly labeled as historical, not presented as current
      guidance a reader could act on by mistake.
- [ ] No internal identifier/enum value leaks into user-facing documentation without its humanized
      label, if the doc is user-facing rather than developer-facing.
- [ ] Setup/runbook steps were actually followed once, start to finish, not just written from
      memory of how it's "supposed to" work.
- [ ] The doc states what it does NOT cover, when relevant, so a reader doesn't assume silence
      means "not applicable" when it actually means "out of scope for this doc."
