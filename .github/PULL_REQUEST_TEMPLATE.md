## Descrição

<!-- O QUE esta PR muda e POR QUE. Não descreva o que o código faz — descreva a motivação. -->

## Tipo de mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Refactor (sem mudança de comportamento)
- [ ] Breaking change
- [ ] Documentação / configuração

## Checklist obrigatório

### Qualidade
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm lint` passa sem erros
- [ ] Testes relevantes adicionados ou atualizados
- [ ] Nenhum `console.log` de debug deixado no código

### Segurança
- [ ] Nenhuma chave, token ou segredo hardcoded
- [ ] Inputs validados com Zod no endpoint (backend) ou no formulário (frontend)
- [ ] Permissões RBAC verificadas (qual role pode acessar este recurso?)
- [ ] Dados sensíveis (CPF, CNPJ, PIX, contas bancárias) tratados com cuidado

### Multi-tenancy
- [ ] Toda query filtra por `org_id` (nunca retorna dados cross-tenant)
- [ ] Guards `TenantGuard` ou equivalente aplicados nos controllers afetados

### Package manager
- [ ] Apenas `pnpm` usado — nenhum `npm install` ou `yarn add` executado
- [ ] Nenhum `package-lock.json` ou `yarn.lock` adicionado/modificado

### Banco de dados (se aplicável)
- [ ] Migration criada para qualquer mudança de schema
- [ ] Migration é reversível (tem `down`)
- [ ] Nenhum dado existente quebrado

### Documentação
- [ ] `GOVERNANCE.md` atualizado se entidade ou módulo novo foi criado
- [ ] Campos novos documentados no DTO correspondente

## Como testar

<!-- Passos para o revisor reproduzir e validar manualmente. -->

1. 
2. 
3. 

## Branches relacionadas / backlog

<!-- Se esta PR implementa um item do BACKLOG.md, referencie o ID aqui (ex.: BACKLOG-007). -->
