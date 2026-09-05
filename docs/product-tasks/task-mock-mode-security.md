# MOCK_MODE — Opt-in Seguro + Bundle Guard

## What & Why
`MOCK_MODE` é definido como `VITE_USE_MOCK !== "false"` — lógica de opt-out. Se `VITE_USE_MOCK` não for definida em produção (esquecimento ou misconfiguration), mock ativa automaticamente, expondo MOCK_DATA e desativando chamadas reais ao backend. Isso é um risco crítico de segurança e confiabilidade em produção: dados falsos apareceriam no SaaS real, todas as mutações seriam silenciosas (sem persistência) e as integrações não funcionariam.

## Done looks like
- `MOCK_MODE` só é `true` quando `VITE_USE_MOCK === "true"` explicitamente (opt-in)
- Em build de produção (`NODE_ENV=production` ou `VITE_USE_MOCK` não definida), MOCK_MODE é `false` automaticamente
- Imports de `mockData.ts` e qualquer mock provider são excluídos do bundle de produção via tree-shaking ou guards de importação
- Console.warn visível em dev quando MOCK_MODE está ativo, bloqueio (throw) se MOCK_MODE for `true` em build prod
- Variável `VITE_USE_MOCK=false` adicionada ao `.env.example` como padrão de produção

## Out of scope
- Remover a lógica mock em si (ainda necessária para dev/standalone)
- Alterar dados do mockData (conteúdo)
- Modificar qualquer hook de integração (já corrigido na Task #655)

## Steps
1. **Inverter lógica em `env.ts`** — mudar para `VITE_USE_MOCK === "true"` (opt-in); adicionar guard que em `IS_PROD && MOCK_MODE` lança erro explícito com mensagem clara
2. **Proteger imports de mockData** — envolver cada import de `mockData.ts` e `mock-rights.provider` em bloco condicional com `MOCK_MODE`; usar `import.meta.env.VITE_USE_MOCK === "true"` como condição para Vite eliminar via tree-shaking no bundle prod
3. **Atualizar `.env.example`** — documentar `VITE_USE_MOCK=false` como valor padrão de produção; `VITE_USE_MOCK=true` como instrução explícita para dev standalone
4. **Validar bundle** — rodar `vite build` e verificar que `mockData` não aparece no output; grep no dist para confirmar ausência
5. **Tsc 0 erros** — garantir que a mudança de tipo não quebra nenhum import existente

## Relevant files
- `client/src/shared/lib/env.ts`
- `client/src/shared/data/mockData.ts`
- `client/src/modules/integrations/providers/mock/mock-rights.provider.ts`
- `.env.example`
