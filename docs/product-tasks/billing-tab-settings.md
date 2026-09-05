# Aba Billing em Configurações

## What & Why
A página de Configurações não tem aba de Billing. É necessário adicionar a aba "Billing" com informações do plano atual, uso de seats, histórico de faturas (mock) e CTA de upgrade de plano — consumindo os dados já disponíveis no `TenantContext` (`tenant.plan`, `tenant.billing`).

## Done looks like
- Nova aba "Billing" visível na barra de abas em `/configuracoes`, após a aba "Integrações"
- Cartão de plano atual com: nome do plano (Starter / Professional / Enterprise), status (Ativo / Trial / Suspenso), data de próxima renovação e badge colorida de status
- Medidor de seats: X de Y utilizados, barra de progresso visual
- Tabela de histórico de faturas com colunas Fatura, Data, Valor, Status e botão "Baixar" (mock com 4–6 entradas realistas)
- Cartão de método de pagamento (mock: cartão terminando em 4242, bandeira Visa)
- Seção de comparação de planos com botão "Fazer Upgrade" (apenas visual — dispara toast informativo)
- Layout enterprise consistente com as demais abas: cards com `CardHeader`/`CardContent`, espaçamento `space-y-6`

## Out of scope
- Integração real com Stripe ou qualquer gateway de pagamento
- Geração ou download real de PDF de faturas
- Alteração real de plano ou método de pagamento

## Steps
1. **Adicionar TabsTrigger "billing"** — Inserir o trigger com ícone `CreditCard` da lucide-react na `TabsList` de `Configuracoes.tsx`, após o trigger de "integracoes"
2. **Construir TabsContent "billing"** — Implementar o conteúdo da aba com 4 cards: (a) Plano Atual + status + renovação, (b) Uso de Seats com barra de progresso, (c) Histórico de Faturas (tabela com mock data), (d) Método de Pagamento mock
3. **Adicionar seção de upgrade de plano** — Tabela comparativa dos 3 planos (Starter/Professional/Enterprise) com destaque no plano actual e botão "Fazer Upgrade" que dispara `toast.info`
4. **Consumir dados do TenantContext** — Usar `useTenant()` para ler `tenant.plan`, `tenant.billing.status`, `tenant.billing.seats`, `tenant.billing.seatsUsed`, `tenant.billing.currentPeriodEnd` e reflectir valores reais no UI

## Relevant files
- `client/src/modules/settings/pages/Configuracoes.tsx:640-690`
- `client/src/app/providers/TenantContext.tsx:82-151`
