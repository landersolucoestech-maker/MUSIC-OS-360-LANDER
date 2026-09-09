# Code Review Checklist

- [ ] The diff does what its description/PR title claims — verified by reading the actual code,
      not assumed from the description.
- [ ] Every new/changed function has a clear single responsibility; a function doing three
      unrelated things is a finding even if each thing is individually correct.
- [ ] Error paths are handled, not swallowed (see `references/anti-patterns.md`'s silent-failure
      section) — every `catch`, every non-2xx branch, every rejected promise is examined.
- [ ] New public API surface (exported function, endpoint, component prop) is actually used by
      something, or is a stated part of a contract another team/service consumes.
- [ ] Naming matches `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` for any concept that already has
      a canonical name — no ad hoc renaming of an existing concept mid-diff.
- [ ] Tests included cover the actual changed behavior (not just re-running an unrelated existing
      suite) and include at least one negative/edge case for non-trivial logic.
- [ ] No secret, credential, or overly verbose internal error is newly logged or returned to a
      client.
