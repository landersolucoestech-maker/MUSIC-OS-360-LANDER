#!/usr/bin/env python3
"""Temporary, deterministic repair for PR #5 web type blockers."""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()


def replace_or_verify(relative_path: str, old: str, new: str, label: str) -> None:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")
    if old in text:
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
        return
    if new in text:
        return
    raise RuntimeError(f"{label}: neither old nor expected new content found in {relative_path}")


replace_or_verify(
    "apps/web/src/modules/settings/pages/Configuracoes.tsx",
    """                onConnect={async (platform, scopes, access_token) => {
                  await connectMarketing(platform, scopes, access_token);
""",
    """                onConnect={async (platform, scopes) => {
                  await connectMarketing(platform, scopes);
""",
    "MarketingOAuthDialog callback signature",
)

replace_or_verify(
    "apps/web/src/modules/crm-relationships/types/index.ts",
    """  endereco?: string | null;
  status?: string | null;
""",
    """  endereco?: string | null;
  cep?: string | null;
  status?: string | null;
""",
    "Cliente CEP field",
)

replace_or_verify(
    "apps/web/src/modules/crm-relationships/hooks/useContacts.ts",
    """    endereco: c.endereco_completo ?? c.address ?? null,
    status: c.status ?? null,
""",
    """    endereco: c.endereco_completo ?? c.address ?? null,
    cep: c.cep ?? null,
    status: c.status ?? null,
""",
    "ApiClient to Cliente CEP mapping",
)

replace_or_verify(
    "apps/web/src/modules/accounting/components/nota-fiscal-form/hooks/useNotaFiscalForm.ts",
    '      tomador_endereco: cliente.endereco || cliente.endereco_completo || "",\n',
    '      tomador_endereco: cliente.endereco || "",\n',
    "Nota fiscal canonical client address",
)

for temporary_path in (
    ".github/web-repair-trigger.txt",
    ".github/workflows/fix-dev-typecheck-blockers.yml",
):
    (ROOT / temporary_path).unlink(missing_ok=True)

print("OAuth PR web type repair applied or already present.")
