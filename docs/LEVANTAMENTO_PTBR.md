# Levantamento PT-BR do Frontend

> Documento de mapeamento (não é auditoria enterprise final). Gerado na fase de
> validação de frontend. Objetivo: registrar strings em inglês remanescentes e
> sua prioridade de correção, sem alterar lógica de negócio.

## Conclusão

O frontend (`apps/web`) está **majoritariamente em PT-BR (~99%)**. Toasts,
placeholders, estados vazios e títulos varridos estão em português. As
ocorrências de inglês user-facing são **isoladas**. A infraestrutura técnica
(Skill / Agent / Workflow Engine / Queue / Processor) **não aparece** na UI.

**Método:** varredura por `>texto<`, `placeholder=`, `label=`, `title=`,
`toast.*`, estados vazios e `aria-label` em `*.tsx`.

## Itens encontrados

### P1 — Visível ao usuário
| Módulo | Arquivo:linha | String | Sugestão | Status |
|---|---|---|---|---|
| workspace | `src/modules/workspace/pages/ArtistOverview.tsx:35` | `Actions` | `Ações` | ✅ corrigido |

### P2 — Primitivos / acessibilidade (pouco/zero visível)
| Item | Arquivo:linha | String | Obs. | Status |
|---|---|---|---|---|
| Sheet primitive | `src/shared/ui/sheet.tsx:62` | `Close` (`sr-only`) | shadcn → `Fechar` | ✅ corrigido |
| Sidebar toggle | `src/shared/ui/sidebar.tsx:252` | `aria-label="Toggle Sidebar"` | → `Alternar barra lateral` | ✅ corrigido |

## Termos técnicos — NÃO traduzir (decisão registrada)

SMTP, Host, Email, Login, SIEM, tenant, Templates, Dashboard, Status, Reels,
Stories, Shorts, Meta Ads, Google Ads, TikTok Ads, Spotify Ads. Aparecem em
telas como `AdminSettings.tsx` já com fraseado em português.

## Observações

- Não há "mistura massiva de idiomas" a sanear.
- As 3 correções acima já foram aplicadas (sem alteração de lógica).
- Caso novas telas sejam criadas, manter a varredura nos mesmos pontos
  (`>texto<`, `placeholder`, `label`, `title`, `toast.*`, estados vazios, `aria-label`).
