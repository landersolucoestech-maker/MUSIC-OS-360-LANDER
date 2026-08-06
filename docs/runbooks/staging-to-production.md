# Runbook — Promoção DEV → Staging → Produção · MUSIC OS 360

> Nenhuma mudança vai a produção sem passar pela branch `staging` e pelo ambiente de staging com todos os gates verdes.
> Produção nunca é ambiente de teste. Secrets de desenvolvimento, staging e produção são independentes.

## Topologia permanente

```text
dev -> staging -> main
```

- `dev`: desenvolvimento e integração contínua.
- `staging`: homologação, migrations autorizadas, deploy e smoke.
- `main`: produção.
- Não promover código diretamente de `dev` para `main`.

## Pré-condição: staging operacional

Só promover para `staging` se o ambiente estiver isolado:

- [ ] Supabase staging isolado (`jjnnjnxjkqipgqebijen`)
- [ ] Redis staging isolado
- [ ] Storage R2 staging com bucket/prefixo separado
- [ ] GitHub Environment `staging` configurado
- [ ] Secrets de staging sem valores de produção
- [ ] API staging responde ao health check
- [ ] Web staging aponta exclusivamente para a API staging

## Ordem de promoção

1. Validar CI e Security Scan verdes em `dev`.
2. Abrir promoção de `dev` para `staging`; não adicionar mudanças funcionais durante a promoção.
3. Após o push/merge em `staging`, aguardar o workflow `staging.yml`.
4. O primeiro run executa `db:check` somente leitura:
   - sem migrations pendentes: segue para RLS, isolamento, deploy e smoke;
   - com migrations pendentes: falha de forma controlada e não altera o banco.
5. Quando houver migrations pendentes e revisadas, executar manualmente `staging.yml` na ref `staging` com `apply_migrations=true`.
6. Validar em staging:
   - autenticação;
   - isolamento tenant A × tenant B;
   - jornadas críticas;
   - integrações;
   - observabilidade;
   - rollback.
7. Após aprovação, promover `staging` para `main`.
8. Aplicar migrations de produção somente em janela autorizada, com backup recente e plano de rollback.
9. Fazer deploy de produção e smoke pós-deploy.

## Checklist pré-produção

- [ ] CI verde no código promovido
- [ ] Security Scan verde
- [ ] `staging.yml` verde
- [ ] Backup de produção com menos de 24 horas
- [ ] Nenhuma migration destrutiva sem plano explícito
- [ ] `db:check` sem pendências após aplicação autorizada
- [ ] RLS e isolamento multi-tenant verificados
- [ ] Smoke de staging concluído
- [ ] Alertas e observabilidade ativos
- [ ] Aprovação do Eng. Lead e Owner

## Rollback

- **Aplicação:** redeploy da versão anterior imutável.
- **Banco:** migrations aditivas podem usar rollback específico; migrations destrutivas exigem restore do backup pré-deploy.
- **Critério de rollback:** erro superior a 1% por 5 minutos, health check sustentadamente indisponível ou incidente SEV1/SEV2.

## Evidências mínimas

- Link do CI verde em `dev`.
- Link do workflow `staging.yml` verde na branch `staging`.
- Resultado de `db:check`, RLS e isolamento.
- Evidência do smoke em staging.
- Backup pré-produção.
- Commit/tag promovido para `main`.

## Bloqueadores automáticos

- Promoção direta `dev -> main`.
- `staging.yml` vermelho.
- Migrations pendentes sem `apply_migrations=true`.
- Backup ausente ou antigo.
- Vulnerabilidade crítica/alta sem exceção aprovada.
- Falha de RLS, isolamento ou smoke.
