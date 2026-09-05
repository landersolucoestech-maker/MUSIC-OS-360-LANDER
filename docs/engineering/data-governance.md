# Data Governance and Migration Safety

Classify sensitive/regulated data only when the project provides a basis for that classification. Minimize exposure in prompts, logs, fixtures and test environments.

Schema/data migrations are evaluated by behavior: compatibility window, backfill strategy, locking/runtime cost, rollback/restore path, large-table behavior, null/default semantics and old/new application coexistence.

Destructive data changes are L5. Require explicit authorization, recovery design and safe validation in disposable/staging contexts before production execution.
