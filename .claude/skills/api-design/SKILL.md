---
name: api-design
description: Designs a new API endpoint/contract before implementation — method/status/shape/versioning/pagination conventions consistent with the rest of the project's real API, checked against contract-reviewer's concerns proactively rather than reactively. Use when a feature-planner batch needs a new endpoint designed, not for reviewing an already-written one (that's contract-reviewer).
---

# API Design

1. Read the project's EXISTING API conventions first (`repo-intelligence`'s system map / a sampling
   of current endpoints) — a new endpoint should look like it belongs, not introduce its own style.
2. Design against `references/checklist.md`: method choice, status codes, request/response shape,
   pagination, versioning, error shape.
3. If the contract is genuinely new (no existing convention to match), record the choice as a
   `decision-record` so future endpoints have something to match.
4. Update the OpenAPI/GraphQL schema (if the project has one) as part of the design, not as an
   afterthought once code exists — `contract-reviewer` checks it doesn't drift, this skill is what
   keeps it authored correctly from the start.

## Output
A designed contract (request/response shape, status codes, error shape) ready for
`implementation-engineer`; see `references/examples.md` for a worked example.
