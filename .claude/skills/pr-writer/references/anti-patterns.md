# PR Description Anti-Patterns

- **"Fixed the bug" with no description of what the bug was**: forces the reviewer to reconstruct
  the problem from the diff alone.
- **"Tests pass" as the entire test plan**: doesn't say which tests, what they actually cover, or
  cite the real evidence — see `references/examples.md` for what a real test plan looks like.
- **Hiding known accepted debt**: a follow-up limitation is known but not mentioned, discovered
  later as a "surprise" instead of a disclosed, tracked decision.
- **A PR description that oversells the diff**: claims a full fix when the change only addresses
  the reported symptom, not the root cause — sets the wrong expectation for reviewers and future
  readers of the history.
- **No mention of what was explicitly NOT changed**: when a reviewer might reasonably expect an
  adjacent thing to have been touched too, say so explicitly rather than leaving it to be
  discovered as a gap.
