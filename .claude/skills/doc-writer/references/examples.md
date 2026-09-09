# Doc Writer — Before/After Example

## Before (stale, matches an old contract)
```md
## Authentication
Send your API key in the `X-Api-Key` header.
```
The project actually migrated to bearer tokens two releases ago; this doc was never updated and a
reader following it gets a 401 with no clue why.

## After (verified against the current code)
```md
## Authentication
Send a bearer token in the `Authorization` header: `Authorization: Bearer <token>`.
Tokens are issued via `POST /auth/token` (see [Auth flow](#auth-flow)) and expire after 1 hour.

> **Migrated from API keys**: if you have documentation or code referencing `X-Api-Key`, that
> method was removed in v3.0 — see [MIGRATION.md](../MIGRATION.md#v3-auth) for the upgrade path.
```
States the current, verified behavior first, and explicitly flags the superseded method with a
pointer to migration guidance — a reader with old bookmarked docs isn't left confused.
