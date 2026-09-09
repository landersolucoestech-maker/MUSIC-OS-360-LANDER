# API Design Anti-Patterns

- **Verb-in-the-URL for a resource action** (`/api/getUser`, `/api/deleteOrder`): the HTTP method
  already carries the verb — `GET /users/:id`, `DELETE /orders/:id`. A verb in the path duplicates
  and can contradict the method.
- **200 OK for everything, including failures**: the body says `{ "error": true }` but the status
  code is 200 — breaks every generic HTTP client/cache/monitoring tool that keys off status code.
- **One giant endpoint returning the entire object graph** "just in case the client needs it" —
  couples every consumer to the heaviest possible query and leaks fields no caller asked for.
- **Silent breaking change**: renaming or removing a response field on an existing endpoint without
  a version bump or deprecation window, because "nothing internal uses it anymore" — an external or
  unowned consumer might.
- **Inconsistent pagination style across endpoints** (`?page=`/`?offset=` here, cursor-based there)
  with no stated reason — forces every client to special-case each endpoint.
- **Leaking the database shape directly**: response field names that are literally the ORM
  entity's internal column names rather than the project's canonical API vocabulary.
