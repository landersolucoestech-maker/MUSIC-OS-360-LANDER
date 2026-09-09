# Debugging Anti-Patterns

- **Shotgun debugging**: changing several things at once hoping one fixes it — you can no longer
  tell which change mattered, or whether the "fix" was a coincidence (e.g. timing shifted).
- **Fixing without reproducing**: patching based on a guess about the cause, without first getting
  a reliable repro — the "fix" often doesn't address the real trigger and the bug returns later
  under slightly different conditions.
- **Print-and-pray**: scattering `console.log`/print statements ad hoc instead of forming a
  specific hypothesis first — produces a wall of output without a clear question it answers.
- **Fixing the last frame of the stack trace**: the line that threw is often a symptom of bad state
  created much earlier — chase the state backward to where it actually went wrong.
- **Assuming the bug is where you're looking**: confirmation bias toward the most recently-touched
  code, when the actual defect is in an unrelated shared dependency.
- **Declaring victory on "it works now"** without understanding why it was broken — see the `why`
  skill; an unexplained fix is a future regression waiting to happen.
