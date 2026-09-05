---
description: Git safety and branch topology for this repo
---

# Git safety

Permanent branches are `main`, `staging`, `dev` only (`.github/workflows/branch-policy.yml`
deletes anything else on a schedule). Promotion flow is `dev -> staging -> main`.

- No direct destructive work on `main`/`staging`/`dev`: no `--force`/`-f` push, no
  `reset --hard`, no `clean -f`, no `branch -D`, no rewriting published history — without the
  user explicitly requesting that exact action in this conversation.
- Before any command that could discard uncommitted work (`checkout`/`restore`/`reset`/`clean`),
  run `git status` first and stash or commit what's there if it isn't yours to discard.
- Never commit or push unless the user asked for it. Never assume a prior approval extends to a
  new push/commit/PR.
- When staging changes, review `git status`/`git diff` for anything unexpected — secrets, files
  outside the task's scope, generated junk — before committing.
- `.env`, `.env.*`, credentials, private keys, and tokens are never to be modified without
  explicit authorization for that specific change, and never printed into logs, commits, or chat.
- `git-auditor` performs the end-of-task audit: branch, HEAD, status, diff, untracked files,
  preexisting-dirty-files preserved, no scope leakage, no secrets.
