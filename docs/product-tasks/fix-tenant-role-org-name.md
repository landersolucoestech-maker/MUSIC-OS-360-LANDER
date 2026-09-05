# Fix: Org Name + Role do Fundador no Boot

## What & Why

Após o cadastro de empresa via Register.tsx, três problemas aparecem no app real (MOCK_MODE=false / Clerk ativo):

1. **Sidebar mostra nome fictício** — `TenantProvider` ignora `musicos360_current_tenant` do localStorage e inicializa sempre com `MOCK_TENANT.name = "Gravadora Exemplo Ltda"`.
2. **Fundador recebe role "Visualizador"** — `ClerkBridgeInner` em `AuthContext.tsx` tem `role: "viewer"` hardcodado (linha 125). Mesmo que o JWT tivesse um campo role, `useCurrentRole()` leria do `user.user_metadata.role` que é sempre `"viewer"`. O `TenantProvider` também padroa para `ROLE_PERMISSIONS.viewer` em modo não-mock.
3. **Páginas aparecem em branco** — viewer não tem permissão de `write` nem de `delete`; componentes com `RequirePermission` renderizam vazio; sem dados reais, as páginas parecem travadas.

## Done looks like

- Ao entrar no app após registro, a sidebar exibe o nome da empresa real cadastrada (ex: "Minha Gravadora Ltda")
- O usuário fundador (quem registrou a empresa) aparece como **Proprietário** na sidebar e topbar, com acesso completo a todas as páginas e ações
- Usuários convidados futuramente recebem roles menores — o fundador nunca desce abaixo de `owner`
- Em MOCK_MODE o comportamento permanece idêntico ao atual (não quebrar)

## Out of scope

- Sincronização de role via JWT Template do Clerk (requer configuração no painel Clerk — futura tarefa)
- Convite de membros e atribuição de roles diferentes por usuário (futura tarefa)
- Qualquer alteração no backend NestJS

## Steps

1. **Ler `musicos360_current_tenant` do localStorage no boot do TenantProvider** — Quando `MOCK_MODE=false`, ao inicializar o `TenantProvider`, tentar ler o objeto do localStorage. Se existir, usar o `name`, `slug`, `industry`, `cnpj`, `phone`, `address` do objeto salvo para sobrescrever os valores fictícios do `MOCK_TENANT`. O role do fundador é sempre `owner`.

2. **Remover o `role: "viewer"` hardcodado do ClerkBridgeInner** — Em `AuthContext.tsx`, substituir o `role: "viewer"` fixo por leitura do localStorage (`musicos360_current_tenant.adminEmail` comparado ao email do clerkUser) para detectar o fundador e retornar `"owner"`. Para qualquer outro usuário (sem correspondência), manter `"viewer"` como padrão seguro.

3. **Atualizar `useSyncTenantFromJWT` para também hidratar a partir do localStorage** — Além de ler o JWT (que pode não ter `role`), o hook deve verificar se há dados em `musicos360_current_tenant` e aplicar `name`, `slug`, e `permissions: ROLE_PERMISSIONS.owner` quando o email do usuário bater com `adminEmail` do tenant salvo.

4. **Garantir que o `TenantProvider` se atualiza reativamente** — Após login com Clerk (callback `isSignedIn` muda), o tenant deve ser re-hidratado a partir do localStorage, não apenas no mount inicial.

5. **Smoke test visual** — Verificar no preview que: (a) nome da org aparece correto na sidebar, (b) a topbar mostra "Proprietário" ou "Administrador", (c) botões de criar/editar estão visíveis, (d) MOCK_MODE ainda funciona sem regressão.

## Relevant files

- `client/src/app/providers/TenantContext.tsx:169-228`
- `client/src/app/providers/AuthContext.tsx:115-170`
- `client/src/app/providers/tenant-labels.ts:70-94`
- `client/src/modules/auth/pages/Register.tsx:203-207`
- `client/src/shared/components/layout/AppSidebar.tsx:373-411`
- `client/src/shared/hooks/useHasRole.ts:52-57`
