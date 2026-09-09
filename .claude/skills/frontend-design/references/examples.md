# Frontend Design — States Worked Example

Designing a "recent uploads" list, illustrating the checklist's "design every state up front."

## Weak (happy-path only)
A mockup showing 5 uploaded files in a table. Nothing else specified.

## Correct — all states designed
- **Loading**: a skeleton row pattern matching the table's actual column widths (reuses the
  project's existing skeleton component, not a generic spinner that jumps the layout on load).
- **Empty**: "No uploads yet — drag a file here or click Upload to get started," with the same
  Upload action available as in the populated state (not a dead end).
- **Error**: "Couldn't load your uploads. [Retry]" — a retry action, not just a static error message
  with no recovery path.
- **Populated**: the table itself, with the humanized label for each file's `status` field
  (`processing` → "Processing", `failed` → "Failed", not the raw enum value) and a destructive
  delete action requiring confirmation.
- **Partially failed** (some uploads succeeded, one failed mid-batch): the table shows the
  successful ones normally and the failed one with an inline retry, rather than the whole batch
  showing as failed or silently dropping the failed item.
