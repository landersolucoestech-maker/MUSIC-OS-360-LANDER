# Dependency and Software Supply-Chain Governance

Dependency/release changes must preserve reproducibility and artifact identity. Inspect manifest plus lockfile, transitive churn, install/lifecycle scripts and runtime compatibility.

For material releases prefer: locked inputs, SBOM where available, artifact digest, source/build provenance, vulnerability/license checks appropriate to the project, and signing/attestation where the release platform supports it.

Do not deploy a mutable/unidentified artifact merely because CI was green. The artifact validated must be traceable to the source commit/change set intended for release.
