-- dashboard-only-realtime-dev-fix.sql  (Parte 69 — Bloco 11/12)
--
-- Uso: Supabase DEV (rypnevnfipygyhysqpdo) → Dashboard → SQL Editor → New query.
-- Cole este arquivo inteiro e execute uma única vez.
--
-- Por que este script existe fora do pipeline normal de migrations:
-- o runner de migrations (npm run db:migrate) já registra e tenta aplicar
-- 20260801000001_RealtimeBroadcastAuthorization automaticamente — mas a
-- automação não tem, nesta sessão, uma conexão de owner (DATABASE_URL)
-- válida contra o projeto DEV (falha de autenticação — credencial
-- desatualizada, não um bloqueio de ownership do Postgres em si) nem
-- Supabase CLI/MCP disponíveis para aplicar via linha de comando. Este SQL
-- é byte-a-byte o mesmo `up()` da migration 20260801000001, então rodá-lo
-- aqui e depois rodar `npm run db:migrate` (assim que a credencial for
-- corrigida) é seguro: o migration runner vai encontrar o efeito já
-- aplicado, gravar a linha em musicos360_migrations e seguir em frente —
-- nenhum SQL divergente do que está versionado em
-- apps/api/src/database/migrations/20260801000001_RealtimeBroadcastAuthorization.ts.
--
-- Este script SÓ altera `realtime.messages` (schema gerenciado pela
-- extensão Realtime do Supabase). Não toca em nenhuma tabela de
-- aplicação, não apaga dados, não concede acesso público.

BEGIN;

DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NULL THEN
    RAISE EXCEPTION 'realtime.messages não existe neste projeto — aborta. Confirme que está conectado ao projeto DEV (rypnevnfipygyhysqpdo), não a MAIN ou STAGING.';
  END IF;
END $$;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_can_receive_broadcast" ON realtime.messages;
CREATE POLICY "tenant_can_receive_broadcast" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() = 'tenant:' || (auth.jwt()->'app_metadata'->>'org_id')
);

DROP POLICY IF EXISTS "user_can_receive_own_broadcast" ON realtime.messages;
CREATE POLICY "user_can_receive_own_broadcast" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() = 'user:' || (auth.jwt()->>'sub')
);

-- Validações pós-aplicação — qualquer falha aqui reverte a transação inteira.
DO $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
  public_policy_count integer;
BEGIN
  SELECT relrowsecurity INTO rls_enabled FROM pg_class WHERE oid = 'realtime.messages'::regclass;
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS não ficou habilitado em realtime.messages — abortando.';
  END IF;

  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'realtime' AND tablename = 'messages'
    AND policyname IN ('tenant_can_receive_broadcast', 'user_can_receive_own_broadcast');
  IF policy_count <> 2 THEN
    RAISE EXCEPTION 'Esperava exatamente 2 policies canônicas em realtime.messages, encontrei %. Abortando.', policy_count;
  END IF;

  SELECT count(*) INTO public_policy_count
  FROM pg_policies
  WHERE schemaname = 'realtime' AND tablename = 'messages'
    AND qual = 'true';
  IF public_policy_count > 0 THEN
    RAISE EXCEPTION 'Encontrada policy com USING (true) em realtime.messages — isso seria acesso público. Abortando.';
  END IF;
END $$;

-- NÃO gravar musicos360_migrations aqui manualmente — deixe o próximo
-- `npm run db:migrate` (rodado com uma conexão de owner válida) registrar
-- a migration normalmente, para nunca haver tracking sem efeito físico
-- comprovado, nem tracking duplicado feito por dois caminhos diferentes.

COMMIT;

-- Passo manual restante, sem equivalente em SQL/Management API:
-- Dashboard → Project Settings → Realtime → desabilitar "Allow public access".
-- Sem isso, os canais "privados" ainda degradam para público e as policies
-- acima não têm efeito prático (ver docstring da migration 20260801000001).
