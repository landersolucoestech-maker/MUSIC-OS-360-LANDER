# P0 Admin Knowledge — De-Mock

> **Data:** 2026-07-03 · **Produção:** intocada · **Sem migrations, sem Stripe, sem RLS/RBAC.**
> **Veredito:** ✅ **PASS** (0 localStorage runtime + 0 mock em homologação/prod; typecheck + tests verdes).

---

## 1. Auditoria do fluxo atual

- `AdminKnowledge.tsx` (página, rota admin) renderizava `KnowledgeBaseManager` incondicionalmente.
- `KnowledgeBaseManager` faz CRUD sobre **`useKnowledgeArticles()`** (`@/modules/support/hooks/useSupport`), que usa **`localStorage`** como fonte (`localStorage.getItem/setItem`), e importa **`MOCK_KNOWLEDGE_CATEGORIES`** (`@/modules/support/data/mockSupport`).
- **Uso do `KnowledgeBaseManager`:** exclusivamente em `AdminKnowledge.tsx` → gatear a página cobre 100% do componente.

## 2. Existe backend real de Knowledge Base?

**Não.** Busca em `apps/api/src` por `knowledge`/`kb_articles`/`knowledge_base`/`artigos` não retornou nenhum controller/rota/entidade de Base de Conhecimento (apenas uma menção não relacionada em `takedowns/dto`). Não há endpoint para fiar.

## 3. Decisão aplicada (passo 4 — sem API)

Como **não há backend**, a tela é **desabilitada em homologação/produção** (`IS_PROD`), exibindo estado **"Funcionalidade indisponível"**. O `KnowledgeBaseManager` (localStorage/mock) é renderizado **apenas em dev/test/storybook** (`!IS_PROD`).

**`apps/web/src/modules/admin/pages/AdminKnowledge.tsx`:**
```tsx
{IS_PROD ? (
  <EmptyState
    icon={BookOpen}
    title="Funcionalidade indisponível"
    description="A Base de Conhecimento depende de um backend ainda não implementado. …nenhum conteúdo fictício é exibido em homologação/produção."
  />
) : (
  <KnowledgeBaseManager />
)}
```

## 4. Arquitetura final

- **Homologação/produção (`IS_PROD=true`):** `AdminKnowledge` → `EmptyState` "indisponível". `KnowledgeBaseManager` **não é renderizado** → `useKnowledgeArticles` **nunca executa** → **zero acesso a localStorage** e **zero dado fictício**.
- **Dev/test/storybook (`!IS_PROD`):** `KnowledgeBaseManager` disponível para iteração de UI (mock/localStorage), como ferramenta de desenvolvimento explícita.
- Quando existir um backend de KB: substituir o branch dev por um `knowledgeService` real + React Query (mesmo padrão de `admin-support`/`admin-audit`), removendo o hook de localStorage.

## 5. Arquivos alterados

- `apps/web/src/modules/admin/pages/AdminKnowledge.tsx` — gate `IS_PROD`; import de `EmptyState` + `IS_PROD`; estado "indisponível" em prod; `KnowledgeBaseManager` restrito a dev.

> Nenhuma mudança em `KnowledgeBaseManager`, `useSupport`/`useKnowledgeArticles` ou `mockSupport` — permanecem como ferramenta de dev, agora inalcançáveis pela superfície admin em produção.

## 6. Evidências de remoção de mock/localStorage runtime

- **Runtime prod:** o único consumidor de `useKnowledgeArticles` na superfície admin é `KnowledgeBaseManager`, que **não monta** quando `IS_PROD` → nenhuma chamada a `localStorage.getItem/setItem` no admin em produção.
- **Sem dado fake em prod:** a UI de CRUD com dados mock é substituída por `EmptyState`.
- **Mocks confinados a dev:** o manager só renderiza em `!IS_PROD` (dev/test/storybook).

## 7. Testes

```
corepack pnpm --filter @music-os-360/web typecheck   → ✅ PASS (exit 0)
corepack pnpm --filter @music-os-360/web test        → ✅ 395/395 (35 arquivos)
```

## 8. Bloqueadores/observações remanescentes

| # | Item | Sev | Nota |
|---|---|---|---|
| B1 | `SupportKnowledge` / `SupportDashboard` usam o mesmo `useKnowledgeArticles` (localStorage) | P3 | **Feature separada** (central de ajuda do módulo de Suporte), fora do objetivo "AdminKnowledge". Em prod já não semeia mock (guarda existente no hook), mas segue localStorage-backed — de-mock à parte quando houver backend. |
| B2 | `KnowledgeBaseManager` ainda é importado estaticamente (bundle) | P4 | Não executa em prod (não renderiza). Opcional: `React.lazy` para code-split e excluir o módulo mock do chunk de produção. |

## 9. Veredito — ✅ PASS

| Critério de PASS | Status |
|---|---|
| 0 localStorage como fonte runtime (homologação/prod) | ✅ |
| 0 mock em homologação/prod | ✅ |
| web typecheck PASS | ✅ |
| web tests PASS | ✅ |

**Produção intocada; sem migrations; sem Stripe; RLS/RBAC não alterados.**
