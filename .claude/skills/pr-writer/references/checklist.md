# PR Description Checklist

- [ ] Summary names the actual requirement/criterion closed (by ID if the mission tracked one),
      not just a vague restatement of the diff.
- [ ] Root cause is stated for a bug fix, not just the symptom that prompted it.
- [ ] Any known accepted debt (`DIVIDA_ACEITA` findings) is disclosed explicitly, with its
      justification — never hidden.
- [ ] Test plan cites the actual evidence (command run, evidence ID) rather than asserting "tests
      pass" with no specifics.
- [ ] Breaking changes to a shared contract are called out explicitly, with the consumer(s)
      affected named.
- [ ] Anything explicitly out of scope for this PR is stated, so a reviewer doesn't wonder why an
      adjacent thing wasn't touched.
- [ ] The PR is not opened/pushed by this skill itself — that remains an explicit user-authorized
      action per `.claude/rules/git-safety.md`.
