import { storage } from "@/shared/lib/storage";

/**
 * Task J — busca TODOS os registros de uma tabela (paginação real, sem cap
 * fixo) e extrai um rótulo de cada um. Uso: pickers legados que armazenam o
 * NOME (não o id) como valor do campo e filtram client-side (ex.: campo
 * "select" com `searchable: true` do MarketingFormModal, ou um `<Select>`
 * simples) — diferente de useEntityLookup (busca server-side por termo
 * digitado), aqui não há id pra resolver "o selecionado" via useEntityById,
 * então o único jeito de nunca perder um registro é ter o conjunto completo
 * de rótulos disponível para o filtro local.
 *
 * ponytail: uma query por tabela custa N/pageSize round-trips para tenants
 * muito grandes — aceitável para popular um dropdown de nomes (poucos KB por
 * página). Teto de segurança em 50 páginas (5000 registros) evita loop
 * infinito se o backend nunca zerar `items`. Upgrade: se esses campos algum
 * dia migrarem de "nome como valor" para "id como valor", trocar por
 * useEntityLookup + AsyncEntityCombobox (busca real server-side).
 */
export async function fetchAllLabels(
  table: string,
  pick: (item: Record<string, unknown>) => string | null | undefined,
): Promise<{ value: string; label: string }[]> {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  const pageSize = 100;

  for (let page = 1; page <= 50; page += 1) {
    const result = await storage.listPaged<Record<string, unknown> & { id: string }>(table, {
      page,
      pageSize,
      orderBy: { column: "created_at", ascending: false },
    });
    for (const item of result.items) {
      const label = pick(item)?.trim();
      if (label && !seen.has(label)) {
        seen.add(label);
        out.push({ value: label, label });
      }
    }
    if (page >= result.totalPages || result.items.length === 0) break;
  }

  return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
