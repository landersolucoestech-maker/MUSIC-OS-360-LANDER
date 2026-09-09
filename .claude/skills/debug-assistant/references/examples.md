# Debugging — Worked Example

**Symptom**: "the export button sometimes produces an empty CSV."

## Weak approach (do not do this)
Add a `console.log` in three random places, run it once, see nothing obviously wrong, add a
fallback that writes a placeholder row if the export is empty, ship it.

## Correct approach
1. **Reproduce**: found it happens specifically when the date-range filter spans a DST transition.
   Reliable repro: export with a range crossing the specific DST date.
2. **Isolate**: bisected to the date-range-to-SQL-filter conversion function; the row-count query
   run with the same range returns 0 rows in that specific case, so the bug is upstream of the CSV
   writer entirely (which correctly writes zero rows for zero input).
3. **Hypothesize**: the filter converts local dates to UTC using a fixed offset instead of the
   actual timezone rules, so the DST-affected range's UTC boundaries exclude every row.
4. **Test the hypothesis**: logged the actual UTC boundaries the filter computed for the DST case
   vs. a non-DST case — confirmed the DST case's boundaries were off by exactly one hour, excluding
   all rows.
5. **Fix the root cause**: replaced the fixed-offset conversion with the timezone-aware date
   library already used elsewhere in the codebase for this exact purpose.
6. **Regression test**: added a test exporting a range that spans a known DST transition date,
   asserting the expected row count.
