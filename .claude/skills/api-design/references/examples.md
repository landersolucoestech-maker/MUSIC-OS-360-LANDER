# API Design Worked Example

Designing `POST /api/releases/:releaseId/deployments` (matches `deployment-record.schema.json`
conceptually, adapted to REST conventions), illustrating the checklist applied.

## Request
```
POST /api/releases/rel_123/deployments
{ "target": "production", "strategy": "canary" }
```
Method is POST because this creates a new deployment (a side-effecting action), not GET.

## Response (success)
```
201 Created
{ "id": "dep_456", "releaseId": "rel_123", "target": "production", "strategy": "canary",
  "createdAt": "2026-01-01T00:00:00Z" }
```
201 (not 200) because a new resource was created; response echoes the created resource including
its generated id, matching how sibling endpoints in this hypothetical project already respond.

## Response (validation error)
```
422 Unprocessable Entity
{ "error": { "code": "invalid_strategy", "message": "strategy must be one of: direct, canary,
  blue-green, feature-flag, progressive", "field": "strategy" } }
```
Uses the project's existing error envelope shape (`error.code`/`message`/`field`) rather than
inventing a new one for this endpoint.

## Response (authorization failure)
```
403 Forbidden
{ "error": { "code": "forbidden", "message": "deployment requires release:deploy permission" } }
```
Not 401 (that's for missing/invalid authentication) — the caller IS authenticated, just not
authorized for this specific action.
