# Side Effects, Idempotency and Recovery

Classify tool operations before execution: READ_ONLY, LOCAL_WRITE, REPOSITORY_WRITE, EXTERNAL_WRITE, INFRASTRUCTURE_WRITE, PRODUCTION_WRITE, DESTRUCTIVE or IRREVERSIBLE.

External/destructive operations require explicit scope and are logged in the Side Effect Ledger. Prefer idempotency keys and read-after-write verification where the target supports them.

A failed or partial side effect cannot be repaired by source rollback alone. Identify the compensating action and reconcile it before completion.

For data/infra/deployment changes distinguish code rollback, schema rollback, data restoration, configuration rollback, deployment rollback and business/integration compensation. Backup existence alone is not restore evidence.
