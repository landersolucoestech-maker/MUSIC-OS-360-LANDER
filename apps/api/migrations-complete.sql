-- ============================================================
-- MUSIC OS 360 — Complete Migration SQL
-- Generated: 2026-05-21T08:45:21.085Z
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── PREAMBLE: patch pre-existing tables from prior schema tools ─────────────
-- These ALTER TABLE statements are fully idempotent (IF EXISTS / IF NOT EXISTS).
-- They run BEFORE any CREATE INDEX so columns exist before indexes reference them.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "external_auth_org_id" VARCHAR(255);
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "plan"             VARCHAR(50)  NOT NULL DEFAULT 'starter';
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "billing_status"   VARCHAR(50)  NOT NULL DEFAULT 'trial';
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "industry"         VARCHAR(100) NOT NULL DEFAULT 'gravadora';
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "cnpj_encrypted"   TEXT;
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "phone"            VARCHAR(50);
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "address"          JSONB        NOT NULL DEFAULT '{}';
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "config"           JSONB        NOT NULL DEFAULT '{}';
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "metadata"         JSONB        NOT NULL DEFAULT '{}';
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "updated_at"       TIMESTAMP    NOT NULL DEFAULT NOW();
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "deleted_at"       TIMESTAMP;
ALTER TABLE IF EXISTS "tenants"       ADD COLUMN IF NOT EXISTS "external_auth_org_id" VARCHAR(255);
ALTER TABLE IF EXISTS "tenants"       ADD COLUMN IF NOT EXISTS "features"         JSONB        NOT NULL DEFAULT '{}';
ALTER TABLE IF EXISTS "tenants"       ADD COLUMN IF NOT EXISTS "settings"         JSONB        NOT NULL DEFAULT '{}';
ALTER TABLE IF EXISTS "tenants"       ADD COLUMN IF NOT EXISTS "active"           BOOLEAN      NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS "tenants"       ADD COLUMN IF NOT EXISTS "deleted_at"       TIMESTAMP;
ALTER TABLE IF EXISTS "tenants"       ADD COLUMN IF NOT EXISTS "updated_at"       TIMESTAMP    NOT NULL DEFAULT NOW();
ALTER TABLE IF EXISTS "org_members"   ADD COLUMN IF NOT EXISTS "auth_user_id"     VARCHAR(255);
ALTER TABLE IF EXISTS "org_members"   ADD COLUMN IF NOT EXISTS "full_name"        VARCHAR(255);
ALTER TABLE IF EXISTS "org_members"   ADD COLUMN IF NOT EXISTS "is_active"        BOOLEAN      NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS "org_members"   ADD COLUMN IF NOT EXISTS "joined_at"        TIMESTAMP;
ALTER TABLE IF EXISTS "org_members"   ADD COLUMN IF NOT EXISTS "updated_at"       TIMESTAMP    NOT NULL DEFAULT NOW();

-- ── Migration tracking table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "musicos360_migrations" (
  "id"        SERIAL PRIMARY KEY,
  "timestamp" BIGINT NOT NULL,
  "name"      VARCHAR NOT NULL
);

-- ── Migration: InitialSchema20240101000000 ──────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS "organizations" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "external_auth_org_id"     VARCHAR(255) UNIQUE,
        "name"             VARCHAR(255) NOT NULL,
        "slug"             VARCHAR(100) NOT NULL UNIQUE,
        "plan"             VARCHAR(50)  NOT NULL DEFAULT 'starter',
        "billing_status"   VARCHAR(50)  NOT NULL DEFAULT 'trial',
        "industry"         VARCHAR(100) NOT NULL DEFAULT 'gravadora',
        "cnpj_encrypted"   TEXT,
        "phone"            VARCHAR(50),
        "address"          JSONB        NOT NULL DEFAULT '{}',
        "config"           JSONB        NOT NULL DEFAULT '{}',
        "metadata"         JSONB        NOT NULL DEFAULT '{}',
        "created_at"       TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMP
      );
CREATE INDEX IF NOT EXISTS "idx_organizations_external_auth_org_id" ON "organizations" ("external_auth_org_id");
CREATE INDEX IF NOT EXISTS "idx_organizations_slug"         ON "organizations" ("slug");
CREATE TABLE IF NOT EXISTS "tenants" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "org_id"        UUID         NOT NULL,
        "external_auth_org_id"  VARCHAR(255) UNIQUE,
        "name"          VARCHAR(255) NOT NULL,
        "slug"          VARCHAR(100) NOT NULL UNIQUE,
        "plan"          VARCHAR(50)  NOT NULL DEFAULT 'starter',
        "features"      JSONB        NOT NULL DEFAULT '{}',
        "settings"      JSONB        NOT NULL DEFAULT '{}',
        "active"        BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMP
      );
CREATE INDEX IF NOT EXISTS "idx_tenants_org_id"       ON "tenants" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_tenants_external_auth_org_id" ON "tenants" ("external_auth_org_id");
CREATE INDEX IF NOT EXISTS "idx_tenants_slug"         ON "tenants" ("slug");
CREATE TABLE IF NOT EXISTS "org_members" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "org_id"          UUID         NOT NULL,
        "tenant_id"       UUID         NOT NULL,
        "auth_user_id"   VARCHAR(255) NOT NULL,
        "email"           VARCHAR(255) NOT NULL,
        "full_name"       VARCHAR(255),
        "role"            VARCHAR(50)  NOT NULL DEFAULT 'viewer',
        "is_active"       BOOLEAN      NOT NULL DEFAULT TRUE,
        "joined_at"       TIMESTAMP,
        "created_at"      TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMP    NOT NULL DEFAULT NOW(),
        UNIQUE ("tenant_id", "auth_user_id")
      );
CREATE INDEX IF NOT EXISTS "idx_org_members_tenant_id"     ON "org_members" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_org_members_auth_user_id" ON "org_members" ("auth_user_id");
CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "org_id"              UUID         NOT NULL,
        "stripe_customer_id"  VARCHAR(255) UNIQUE,
        "stripe_sub_id"       VARCHAR(255) UNIQUE,
        "plan"                VARCHAR(50)  NOT NULL DEFAULT 'starter',
        "status"              VARCHAR(50)  NOT NULL DEFAULT 'trial',
        "trial_ends_at"       TIMESTAMP,
        "current_period_end"  TIMESTAMP,
        "seats"               INTEGER      NOT NULL DEFAULT 3,
        "seats_used"          INTEGER      NOT NULL DEFAULT 1,
        "metadata"            JSONB        NOT NULL DEFAULT '{}',
        "created_at"          TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMP    NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_billing_org_id" ON "billing_subscriptions" ("org_id");
CREATE TABLE IF NOT EXISTS "artists" (
        "id"                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"                    UUID         NOT NULL,
        "nome_artistico"               VARCHAR(255) NOT NULL,
        "nome_civil"                   VARCHAR(255),
        "tipo"                         VARCHAR(50)  NOT NULL DEFAULT 'solo',
        "status"                       VARCHAR(50)  NOT NULL DEFAULT 'em_negociacao',
        "status_cadastro"              VARCHAR(50)  NOT NULL DEFAULT 'ativo',
        "genero_musical"               VARCHAR(100),
        "email_encrypted"              TEXT,
        "telefone_encrypted"           TEXT,
        "cpf_cnpj_encrypted"           TEXT,
        "foto_url"                     TEXT,
        "banner_url"                   TEXT,
        "galeria_urls"                 JSONB        NOT NULL DEFAULT '[]',
        "video_apresentacao_url"       TEXT,
        "documentos"                   JSONB        NOT NULL DEFAULT '[]',
        "observacoes"                  TEXT,
        "manager_nome"                 VARCHAR(255),
        "manager_contato_encrypted"    TEXT,
        "produtor_executivo"           VARCHAR(255),
        "agencia_booking"              VARCHAR(255),
        "label_parceira"               VARCHAR(255),
        "especialidades"               JSONB        NOT NULL DEFAULT '[]',
        "spotify_artist_id"            VARCHAR(255),
        "youtube_channel_id"           VARCHAR(255),
        "deezer_url"                   TEXT,
        "apple_music_url"              TEXT,
        "soundcloud_url"               TEXT,
        "contrato_id"                  UUID,
        "org_slug"                     VARCHAR(100),
        "metadata"                     JSONB        NOT NULL DEFAULT '{}',
        "created_at"                   TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"                   TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"                   TIMESTAMP,
        "created_by"                   VARCHAR(255),
        "updated_by"                   VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_artists_tenant_id"        ON "artists" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_artists_tenant_status"    ON "artists" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_artists_tenant_deleted"   ON "artists" ("tenant_id", "deleted_at");
CREATE TABLE IF NOT EXISTS "works" (
        "id"                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"                       UUID         NOT NULL,
        "titulo"                          VARCHAR(500) NOT NULL,
        "compositor"                      VARCHAR(255),
        "compositores"                    TEXT,
        "co_compositores"                 TEXT,
        "detentores"                      TEXT,
        "editora"                         VARCHAR(255),
        "isrc"                            VARCHAR(20),
        "iswc"                            VARCHAR(20),
        "cod_abramus"                     VARCHAR(100),
        "cod_ecad"                        VARCHAR(100),
        "tipo"                            VARCHAR(100) NOT NULL,
        "genero"                          VARCHAR(100),
        "status"                          VARCHAR(50)  NOT NULL DEFAULT 'pendente',
        "duracao"                         VARCHAR(20),
        "origem_externa"                  VARCHAR(100),
        "origem_externa_id"               VARCHAR(255),
        "origem_externa_sincronizado_em"  TIMESTAMP,
        "metadata"                        JSONB        NOT NULL DEFAULT '{}',
        "created_at"                      TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"                      TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"                      TIMESTAMP,
        "created_by"                      VARCHAR(255),
        "updated_by"                      VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_works_tenant_id"     ON "works" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_works_tenant_status" ON "works" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_works_isrc"          ON "works" ("isrc");
CREATE INDEX IF NOT EXISTS "idx_works_iswc"          ON "works" ("iswc");
CREATE TABLE IF NOT EXISTS "phonograms" (
        "id"                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"                       UUID         NOT NULL,
        "titulo"                          VARCHAR(500) NOT NULL,
        "obra_id"                         UUID,
        "artista_id"                      UUID,
        "isrc"                            VARCHAR(20),
        "duracao"                         VARCHAR(20),
        "tipo"                            VARCHAR(100) NOT NULL,
        "status"                          VARCHAR(50)  NOT NULL DEFAULT 'pendente',
        "compositores"                    TEXT,
        "interpretes"                     TEXT,
        "produtores"                      TEXT,
        "gravadora"                       VARCHAR(255),
        "cod_abramus"                     VARCHAR(100),
        "cod_ecad"                        VARCHAR(100),
        "origem_externa"                  VARCHAR(100),
        "origem_externa_id"               VARCHAR(255),
        "origem_externa_sincronizado_em"  TIMESTAMP,
        "metadata"                        JSONB        NOT NULL DEFAULT '{}',
        "created_at"                      TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"                      TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"                      TIMESTAMP,
        "created_by"                      VARCHAR(255),
        "updated_by"                      VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_phonograms_tenant_id"  ON "phonograms" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_phonograms_obra_id"    ON "phonograms" ("obra_id");
CREATE INDEX IF NOT EXISTS "idx_phonograms_artista_id" ON "phonograms" ("artista_id");
CREATE INDEX IF NOT EXISTS "idx_phonograms_isrc"       ON "phonograms" ("isrc");
CREATE TABLE IF NOT EXISTS "contracts" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"         UUID         NOT NULL,
        "titulo"            VARCHAR(500) NOT NULL,
        "tipo"              VARCHAR(100) NOT NULL,
        "status"            VARCHAR(50)  NOT NULL DEFAULT 'rascunho',
        "artista_id"        UUID,
        "cliente_id"        UUID,
        "lancamento_id"     UUID,
        "data_inicio"       TIMESTAMP,
        "data_fim"          TIMESTAMP,
        "valor"             DECIMAL(15,2),
        "exclusivo"         BOOLEAN      NOT NULL DEFAULT FALSE,
        "observacoes"       TEXT,
        "arquivo_url"       TEXT,
        "autentique_doc_id" VARCHAR(255),
        "signing_platform"  VARCHAR(100),
        "versoes"           JSONB        NOT NULL DEFAULT '[]',
        "metadata"          JSONB        NOT NULL DEFAULT '{}',
        "created_at"        TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"        TIMESTAMP,
        "created_by"        VARCHAR(255),
        "updated_by"        VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_contracts_tenant_id"     ON "contracts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_contracts_tenant_status" ON "contracts" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_contracts_artista_id"    ON "contracts" ("artista_id");
CREATE INDEX IF NOT EXISTS "idx_contracts_data_fim"      ON "contracts" ("data_fim");
CREATE TABLE IF NOT EXISTS "contract_templates" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID         NOT NULL,
        "titulo"      VARCHAR(500) NOT NULL,
        "tipo"        VARCHAR(100) NOT NULL,
        "conteudo"    TEXT         NOT NULL,
        "variaveis"   JSONB        NOT NULL DEFAULT '[]',
        "ativo"       BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"  TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMP,
        "created_by"  VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_contract_templates_tenant" ON "contract_templates" ("tenant_id");
CREATE TABLE IF NOT EXISTS "transactions" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"       UUID          NOT NULL,
        "tipo"            VARCHAR(50)   NOT NULL,
        "categoria"       VARCHAR(100)  NOT NULL,
        "descricao"       TEXT,
        "valor"           DECIMAL(15,2) NOT NULL,
        "data"            TIMESTAMP     NOT NULL,
        "status"          VARCHAR(50)   NOT NULL DEFAULT 'pendente',
        "artista_id"      UUID,
        "contrato_id"     UUID,
        "projeto_id"      UUID,
        "referencia"      VARCHAR(255),
        "comprovante_url" TEXT,
        "metadata"        JSONB         NOT NULL DEFAULT '{}',
        "created_at"      TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMP     NOT NULL DEFAULT NOW(),
        "deleted_at"      TIMESTAMP,
        "created_by"      VARCHAR(255),
        "updated_by"      VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_id"   ON "transactions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_data" ON "transactions" ("tenant_id", "data");
CREATE INDEX IF NOT EXISTS "idx_transactions_artista_id"  ON "transactions" ("artista_id");
CREATE TABLE IF NOT EXISTS "invoices" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"               UUID          NOT NULL,
        "numero"                  VARCHAR(100),
        "tipo"                    VARCHAR(100)  NOT NULL,
        "status"                  VARCHAR(50)   NOT NULL DEFAULT 'pendente',
        "prestador_id"            UUID,
        "tomador_nome"            VARCHAR(255),
        "tomador_doc_encrypted"   TEXT,
        "valor"                   DECIMAL(15,2) NOT NULL,
        "descricao"               TEXT,
        "data_emissao"            TIMESTAMP,
        "data_vencimento"         TIMESTAMP,
        "arquivo_url"             TEXT,
        "metadata"                JSONB         NOT NULL DEFAULT '{}',
        "created_at"              TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"              TIMESTAMP     NOT NULL DEFAULT NOW(),
        "deleted_at"              TIMESTAMP,
        "created_by"              VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_id"     ON "invoices" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_status" ON "invoices" ("tenant_id", "status");
CREATE TABLE IF NOT EXISTS "clients" (
        "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"          UUID         NOT NULL,
        "nome"               VARCHAR(255) NOT NULL,
        "segmento"           VARCHAR(100),
        "tipo_pessoa"        VARCHAR(50)  NOT NULL DEFAULT 'pessoa_juridica',
        "cpf_cnpj_encrypted" TEXT,
        "responsavel"        VARCHAR(255),
        "email_encrypted"    TEXT,
        "telefone_encrypted" TEXT,
        "endereco"           VARCHAR(500),
        "cidade"             VARCHAR(100),
        "estado"             VARCHAR(2),
        "status"             VARCHAR(50)  NOT NULL DEFAULT 'ativo',
        "observacoes"        TEXT,
        "metadata"           JSONB        NOT NULL DEFAULT '{}',
        "created_at"         TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"         TIMESTAMP,
        "created_by"         VARCHAR(255),
        "updated_by"         VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_clients_tenant_id"     ON "clients" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_clients_tenant_status" ON "clients" ("tenant_id", "status");
CREATE TABLE IF NOT EXISTS "leads" (
        "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"          UUID         NOT NULL,
        "cliente_id"         UUID,
        "nome"               VARCHAR(255) NOT NULL,
        "email_encrypted"    TEXT,
        "telefone_encrypted" TEXT,
        "empresa"            VARCHAR(255),
        "status"             VARCHAR(50)  NOT NULL DEFAULT 'novo',
        "score"              INTEGER      NOT NULL DEFAULT 0,
        "fonte"              VARCHAR(100),
        "pipeline_stage"     VARCHAR(100),
        "metadata"           JSONB        NOT NULL DEFAULT '{}',
        "created_at"         TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"         TIMESTAMP,
        "created_by"         VARCHAR(255),
        "updated_by"         VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_id"     ON "leads" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_status" ON "leads" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_leads_cliente_id"    ON "leads" ("cliente_id");
CREATE TABLE IF NOT EXISTS "lead_interactions" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID         NOT NULL,
        "lead_id"     UUID         NOT NULL,
        "tipo"        VARCHAR(100) NOT NULL,
        "descricao"   TEXT,
        "data"        TIMESTAMP    NOT NULL DEFAULT NOW(),
        "created_by"  VARCHAR(255),
        "created_at"  TIMESTAMP    NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_lead_interactions_tenant" ON "lead_interactions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_lead_interactions_lead"   ON "lead_interactions" ("lead_id");
CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID          NOT NULL,
        "nome"        VARCHAR(255)  NOT NULL,
        "tipo"        VARCHAR(100)  NOT NULL,
        "status"      VARCHAR(50)   NOT NULL DEFAULT 'rascunho',
        "objetivo"    TEXT,
        "orcamento"   DECIMAL(15,2),
        "data_inicio" TIMESTAMP,
        "data_fim"    TIMESTAMP,
        "artista_id"  UUID,
        "metadata"    JSONB         NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMP,
        "created_by"  VARCHAR(255),
        "updated_by"  VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_campaigns_tenant_id" ON "campaigns" ("tenant_id");
CREATE TABLE IF NOT EXISTS "briefings" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"    UUID         NOT NULL,
        "titulo"       VARCHAR(255) NOT NULL,
        "descricao"    TEXT,
        "artista_id"   UUID,
        "campanha_id"  UUID,
        "status"       VARCHAR(50)  NOT NULL DEFAULT 'rascunho',
        "prazo"        TIMESTAMP,
        "metadata"     JSONB        NOT NULL DEFAULT '{}',
        "created_at"   TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"   TIMESTAMP,
        "created_by"   VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_briefings_tenant_id" ON "briefings" ("tenant_id");
CREATE TABLE IF NOT EXISTS "events" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID          NOT NULL,
        "titulo"      VARCHAR(255)  NOT NULL,
        "tipo"        VARCHAR(100)  NOT NULL,
        "status"      VARCHAR(50)   NOT NULL DEFAULT 'agendado',
        "data"        TIMESTAMP     NOT NULL,
        "local"       VARCHAR(255),
        "artista_id"  UUID,
        "valor"       DECIMAL(15,2),
        "observacoes" TEXT,
        "metadata"    JSONB         NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMP,
        "created_by"  VARCHAR(255),
        "updated_by"  VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_events_tenant_id"   ON "events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_events_tenant_data" ON "events" ("tenant_id", "data");
CREATE TABLE IF NOT EXISTS "projects" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID          NOT NULL,
        "nome"        VARCHAR(255)  NOT NULL,
        "tipo"        VARCHAR(100)  NOT NULL,
        "status"      VARCHAR(50)   NOT NULL DEFAULT 'planejamento',
        "artista_id"  UUID,
        "data_inicio" TIMESTAMP,
        "data_fim"    TIMESTAMP,
        "orcamento"   DECIMAL(15,2),
        "descricao"   TEXT,
        "metadata"    JSONB         NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMP,
        "created_by"  VARCHAR(255),
        "updated_by"  VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_projects_tenant_id" ON "projects" ("tenant_id");
CREATE TABLE IF NOT EXISTS "releases" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"       UUID         NOT NULL,
        "artista_id"      UUID,
        "titulo"          VARCHAR(500) NOT NULL,
        "tipo"            VARCHAR(100) NOT NULL DEFAULT 'single',
        "status"          VARCHAR(50)  NOT NULL DEFAULT 'planejamento',
        "distribuidora"   VARCHAR(255),
        "upc"             VARCHAR(20),
        "data_lancamento" TIMESTAMP,
        "plataformas"     JSONB        NOT NULL DEFAULT '[]',
        "capa_url"        TEXT,
        "metadata"        JSONB        NOT NULL DEFAULT '{}',
        "created_at"      TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"      TIMESTAMP,
        "created_by"      VARCHAR(255),
        "updated_by"      VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_releases_tenant_id"  ON "releases" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_releases_artista_id" ON "releases" ("artista_id");
CREATE TABLE IF NOT EXISTS "shares" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"    UUID         NOT NULL,
        "obra_id"      UUID,
        "fonograma_id" UUID,
        "titular_nome" VARCHAR(255) NOT NULL,
        "titular_doc"  VARCHAR(50),
        "papel"        VARCHAR(100) NOT NULL DEFAULT 'autor',
        "percentual"   DECIMAL(7,4) NOT NULL,
        "status"       VARCHAR(50)  NOT NULL DEFAULT 'ativo',
        "metadata"     JSONB        NOT NULL DEFAULT '{}',
        "created_at"   TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"   TIMESTAMP
      );
CREATE INDEX IF NOT EXISTS "idx_shares_tenant_id" ON "shares" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_shares_obra_id"   ON "shares" ("obra_id");
CREATE TABLE IF NOT EXISTS "takedowns" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID         NOT NULL,
        "titulo"      VARCHAR(255) NOT NULL,
        "plataforma"  VARCHAR(100) NOT NULL,
        "url"         TEXT,
        "status"      VARCHAR(50)  NOT NULL DEFAULT 'pendente',
        "obra_id"     UUID,
        "artista_id"  UUID,
        "motivo"      TEXT,
        "resposta"    TEXT,
        "metadata"    JSONB        NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMP,
        "created_by"  VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_takedowns_tenant_id"     ON "takedowns" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_takedowns_tenant_status" ON "takedowns" ("tenant_id", "status");
CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"     UUID         NOT NULL,
        "ticket_number" VARCHAR(50)  NOT NULL UNIQUE,
        "subject"       VARCHAR(500) NOT NULL,
        "description"   TEXT,
        "status"        VARCHAR(50)  NOT NULL DEFAULT 'open',
        "priority"      VARCHAR(50)  NOT NULL DEFAULT 'medium',
        "category"      VARCHAR(100),
        "created_by"    VARCHAR(255) NOT NULL,
        "assigned_to"   VARCHAR(255),
        "sla_deadline"  TIMESTAMP,
        "resolved_at"   TIMESTAMP,
        "tags"          JSONB        NOT NULL DEFAULT '[]',
        "metadata"      JSONB        NOT NULL DEFAULT '{}',
        "created_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMP
      );
CREATE INDEX IF NOT EXISTS "idx_support_tickets_tenant" ON "support_tickets" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_support_tickets_status" ON "support_tickets" ("status");
CREATE TABLE IF NOT EXISTS "notifications" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"  UUID         NOT NULL,
        "user_id"    VARCHAR(255) NOT NULL,
        "title"      VARCHAR(255) NOT NULL,
        "body"       TEXT,
        "type"       VARCHAR(100) NOT NULL,
        "entity"     VARCHAR(100),
        "entity_id"  VARCHAR(255),
        "read_at"    TIMESTAMP,
        "metadata"   JSONB        NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP    NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_user"        ON "notifications" ("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_user_readat" ON "notifications" ("tenant_id", "user_id", "read_at");
CREATE TABLE IF NOT EXISTS "uploads" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"     UUID         NOT NULL,
        "user_id"       VARCHAR(255) NOT NULL,
        "file_id"       VARCHAR(255) NOT NULL UNIQUE,
        "original_name" VARCHAR(500) NOT NULL,
        "mime_type"     VARCHAR(255) NOT NULL,
        "size_bytes"    INTEGER      NOT NULL,
        "r2_key"        TEXT         NOT NULL,
        "category"      VARCHAR(50)  NOT NULL,
        "entity"        VARCHAR(100),
        "entity_id"     VARCHAR(255),
        "status"        VARCHAR(50)  NOT NULL DEFAULT 'pending',
        "confirmed_at"  TIMESTAMP,
        "metadata"      JSONB        NOT NULL DEFAULT '{}',
        "created_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMP
      );
CREATE INDEX IF NOT EXISTS "idx_uploads_tenant_id"   ON "uploads" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_uploads_file_id"     ON "uploads" ("file_id");
CREATE INDEX IF NOT EXISTS "idx_uploads_entity"      ON "uploads" ("entity", "entity_id");
CREATE TABLE IF NOT EXISTS "integrations" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"             UUID         NOT NULL,
        "provider"              VARCHAR(100) NOT NULL,
        "status"                VARCHAR(50)  NOT NULL DEFAULT 'disconnected',
        "credentials_encrypted" TEXT,
        "settings"              JSONB        NOT NULL DEFAULT '{}',
        "last_sync_at"          TIMESTAMP,
        "failure_count"         INTEGER      NOT NULL DEFAULT 0,
        "metadata"              JSONB        NOT NULL DEFAULT '{}',
        "created_at"            TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"            TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"            TIMESTAMP,
        UNIQUE ("tenant_id", "provider")
      );
CREATE INDEX IF NOT EXISTS "idx_integrations_tenant" ON "integrations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "oauth_connections" (
        "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"                UUID         NOT NULL,
        "user_id"                  VARCHAR(255) NOT NULL,
        "provider"                 VARCHAR(100) NOT NULL,
        "access_token_encrypted"   TEXT         NOT NULL,
        "refresh_token_encrypted"  TEXT,
        "expires_at"               TIMESTAMP,
        "scopes"                   TEXT,
        "metadata"                 JSONB        NOT NULL DEFAULT '{}',
        "created_at"               TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"               TIMESTAMP    NOT NULL DEFAULT NOW(),
        UNIQUE ("tenant_id", "user_id", "provider")
      );
CREATE INDEX IF NOT EXISTS "idx_oauth_tenant_id" ON "oauth_connections" ("tenant_id");
CREATE TABLE IF NOT EXISTS "webhook_events" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"    UUID,
        "provider"     VARCHAR(100) NOT NULL,
        "event_type"   VARCHAR(100) NOT NULL,
        "external_id"  VARCHAR(255) UNIQUE,
        "payload"      JSONB        NOT NULL,
        "status"       VARCHAR(50)  NOT NULL DEFAULT 'pending',
        "processed_at" TIMESTAMP,
        "error"        TEXT,
        "retry_count"  INTEGER      NOT NULL DEFAULT 0,
        "created_at"   TIMESTAMP    NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_webhook_events_provider" ON "webhook_events" ("provider", "event_type");
CREATE INDEX IF NOT EXISTS "idx_webhook_events_status"   ON "webhook_events" ("status");
CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID,
        "user_id"     VARCHAR(255),
        "action"      VARCHAR(100) NOT NULL,
        "entity"      VARCHAR(100) NOT NULL,
        "entity_id"   VARCHAR(255),
        "before"      JSONB,
        "after"       JSONB,
        "ip_address"  VARCHAR(45),
        "user_agent"  TEXT,
        "request_id"  VARCHAR(255),
        "metadata"    JSONB        NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMP    NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_id" ON "audit_logs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity"    ON "audit_logs" ("tenant_id", "entity");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id"   ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created"   ON "audit_logs" ("created_at");
CREATE TABLE IF NOT EXISTS "ai_jobs" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"    UUID          NOT NULL,
        "user_id"      VARCHAR(255)  NOT NULL,
        "provider"     VARCHAR(50)   NOT NULL,
        "model"        VARCHAR(100)  NOT NULL,
        "skill"        VARCHAR(100)  NOT NULL,
        "status"       VARCHAR(50)   NOT NULL DEFAULT 'pending',
        "input_tokens" INTEGER       NOT NULL DEFAULT 0,
        "output_tokens" INTEGER      NOT NULL DEFAULT 0,
        "cost_usd"     DECIMAL(12,8) NOT NULL DEFAULT 0,
        "latency_ms"   INTEGER,
        "completed_at" TIMESTAMP,
        "metadata"     JSONB         NOT NULL DEFAULT '{}',
        "created_at"   TIMESTAMP     NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_ai_jobs_tenant_id"  ON "ai_jobs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_ai_jobs_created_at" ON "ai_jobs" ("created_at");
CREATE TABLE IF NOT EXISTS "artist_goals" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID          NOT NULL,
        "artista_id"  UUID          NOT NULL,
        "titulo"      VARCHAR(255)  NOT NULL,
        "tipo"        VARCHAR(100)  NOT NULL,
        "meta_valor"  DECIMAL(15,2),
        "valor_atual" DECIMAL(15,2) NOT NULL DEFAULT 0,
        "status"      VARCHAR(50)   NOT NULL DEFAULT 'em_andamento',
        "periodo"     VARCHAR(50)   NOT NULL DEFAULT 'mensal',
        "data_inicio" TIMESTAMP,
        "data_fim"    TIMESTAMP,
        "metadata"    JSONB         NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMP     NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMP,
        "created_by"  VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_artist_goals_tenant_id"  ON "artist_goals" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_artist_goals_artista_id" ON "artist_goals" ("artista_id");
CREATE TABLE IF NOT EXISTS "content_detections" (
        "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"          UUID         NOT NULL,
        "obra_id"            UUID,
        "artista_id"         UUID,
        "plataforma"         VARCHAR(100) NOT NULL,
        "titulo_detectado"   VARCHAR(500),
        "url"                TEXT,
        "score"              DECIMAL(5,4),
        "status"             VARCHAR(50)  NOT NULL DEFAULT 'pendente',
        "tipo"               VARCHAR(100) NOT NULL DEFAULT 'uso_nao_autorizado',
        "detectado_em"       TIMESTAMP    NOT NULL DEFAULT NOW(),
        "metadata"           JSONB        NOT NULL DEFAULT '{}',
        "created_at"         TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"         TIMESTAMP
      );
CREATE INDEX IF NOT EXISTS "idx_content_detections_tenant" ON "content_detections" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_content_detections_status" ON "content_detections" ("status");
CREATE TABLE IF NOT EXISTS "ecad_reports" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"     UUID          NOT NULL,
        "obra_id"       UUID,
        "periodo"       VARCHAR(20)   NOT NULL,
        "tipo"          VARCHAR(100)  NOT NULL,
        "valor_bruto"   DECIMAL(15,2),
        "valor_liquido" DECIMAL(15,2),
        "status"        VARCHAR(50)   NOT NULL DEFAULT 'pendente',
        "arquivo_url"   TEXT,
        "metadata"      JSONB         NOT NULL DEFAULT '{}',
        "created_at"    TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMP     NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMP,
        "created_by"    VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_ecad_reports_tenant"  ON "ecad_reports" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_ecad_reports_periodo" ON "ecad_reports" ("periodo");
CREATE TABLE IF NOT EXISTS "employees" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"           UUID         NOT NULL,
        "nome"                VARCHAR(255) NOT NULL,
        "cargo"               VARCHAR(255),
        "departamento"        VARCHAR(100),
        "tipo_contrato"       VARCHAR(100) NOT NULL DEFAULT 'clt',
        "status"              VARCHAR(50)  NOT NULL DEFAULT 'ativo',
        "email_encrypted"     TEXT,
        "telefone_encrypted"  TEXT,
        "cpf_encrypted"       TEXT,
        "salario"             DECIMAL(15,2),
        "data_admissao"       TIMESTAMP,
        "data_demissao"       TIMESTAMP,
        "documentos"          JSONB        NOT NULL DEFAULT '[]',
        "metadata"            JSONB        NOT NULL DEFAULT '{}',
        "created_at"          TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMP    NOT NULL DEFAULT NOW(),
        "deleted_at"          TIMESTAMP,
        "created_by"          VARCHAR(255)
      );
CREATE INDEX IF NOT EXISTS "idx_employees_tenant_id" ON "employees" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_employees_status"    ON "employees" ("status");
CREATE TABLE IF NOT EXISTS "payroll_entries" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"      UUID          NOT NULL,
        "employee_id"    UUID          NOT NULL,
        "competencia"    VARCHAR(7)    NOT NULL,
        "salario_bruto"  DECIMAL(15,2) NOT NULL,
        "descontos"      DECIMAL(15,2) NOT NULL DEFAULT 0,
        "salario_liquido" DECIMAL(15,2) NOT NULL,
        "status"         VARCHAR(50)   NOT NULL DEFAULT 'pendente',
        "arquivo_url"    TEXT,
        "pago_em"        TIMESTAMP,
        "metadata"       JSONB         NOT NULL DEFAULT '{}',
        "created_at"     TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMP     NOT NULL DEFAULT NOW(),
        UNIQUE ("employee_id", "competencia")
      );
CREATE INDEX IF NOT EXISTS "idx_payroll_tenant_id"    ON "payroll_entries" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_payroll_employee_id"  ON "payroll_entries" ("employee_id");
CREATE TABLE IF NOT EXISTS "leave_requests" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"    UUID         NOT NULL,
        "employee_id"  UUID         NOT NULL,
        "tipo"         VARCHAR(100) NOT NULL,
        "data_inicio"  TIMESTAMP    NOT NULL,
        "data_fim"     TIMESTAMP    NOT NULL,
        "status"       VARCHAR(50)  NOT NULL DEFAULT 'pendente',
        "motivo"       TEXT,
        "aprovado_por" VARCHAR(255),
        "metadata"     JSONB        NOT NULL DEFAULT '{}',
        "created_at"   TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP    NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_leave_tenant_id"    ON "leave_requests" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_leave_employee_id"  ON "leave_requests" ("employee_id");

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20240101000000, 'InitialSchema20240101000000') ON CONFLICT DO NOTHING;

-- ── Migration: WorkflowTransitions20240601000001 ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "workflow_transitions" (
        "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID        NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id"   UUID        NOT NULL,
        "from_status" VARCHAR(100) NOT NULL,
        "to_status"   VARCHAR(100) NOT NULL,
        "actor_id"    VARCHAR(255) NOT NULL,
        "actor_role"  VARCHAR(100),
        "reason"      TEXT,
        "metadata"    JSONB       NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMP   NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "IDX_wf_transitions_tenant_type_entity"
        ON "workflow_transitions" ("tenant_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "IDX_wf_transitions_tenant"
        ON "workflow_transitions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "IDX_wf_transitions_entity"
        ON "workflow_transitions" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "IDX_wf_transitions_created_at"
        ON "workflow_transitions" ("created_at" DESC);

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20240601000001, 'WorkflowTransitions20240601000001') ON CONFLICT DO NOTHING;

-- ── Migration: DomainEventLog20240602000001 ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "domain_event_log" (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"      UUID,
        "event_type"     VARCHAR(100) NOT NULL,
        "aggregate_type" VARCHAR(100),
        "aggregate_id"   VARCHAR(255),
        "actor_id"       VARCHAR(255),
        "correlation_id" VARCHAR(255),
        "payload"        JSONB        NOT NULL DEFAULT '{}',
        "occurred_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "processed_at"   TIMESTAMP,
        "error"          TEXT,
        "created_at"     TIMESTAMP    NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "IDX_del_tenant_id"
        ON "domain_event_log" ("tenant_id");
CREATE INDEX IF NOT EXISTS "IDX_del_tenant_event_type"
        ON "domain_event_log" ("tenant_id", "event_type");
CREATE INDEX IF NOT EXISTS "IDX_del_correlation_id"
        ON "domain_event_log" ("correlation_id");
CREATE INDEX IF NOT EXISTS "IDX_del_occurred_at"
        ON "domain_event_log" ("occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "IDX_del_aggregate"
        ON "domain_event_log" ("aggregate_type", "aggregate_id");

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20240602000001, 'DomainEventLog20240602000001') ON CONFLICT DO NOTHING;

-- ── Migration: AuditLogEnterpriseColumns20260516000001 ──────────────────────────────────────────────

ALTER TABLE "audit_logs"
        ADD COLUMN IF NOT EXISTS "org_id"         UUID,
        ADD COLUMN IF NOT EXISTS "actor_role"     VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "diff"           JSONB,
        ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "session_id"     VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "http_method"    VARCHAR(10),
        ADD COLUMN IF NOT EXISTS "http_path"      TEXT;
CREATE INDEX IF NOT EXISTS "idx_audit_logs_correlation_id"
        ON "audit_logs" ("correlation_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_entity_id"
        ON "audit_logs" ("tenant_id", "entity", "entity_id");
CREATE OR REPLACE FUNCTION fn_audit_logs_immutable()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION
          'audit_logs is append-only — UPDATE and DELETE are forbidden. '
          'Attempted operation: %. Offending row id: %',
          TG_OP, OLD.id;
        RETURN NULL;
      END;
      $$;
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON "audit_logs";
CREATE TRIGGER trg_audit_logs_immutable
        BEFORE UPDATE OR DELETE ON "audit_logs"
        FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_immutable();

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20260516000001, 'AuditLogEnterpriseColumns20260516000001') ON CONFLICT DO NOTHING;

-- ── Migration: ActivityLogs20260520000002 ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" UUID NOT NULL,
        "action" VARCHAR(100) NOT NULL,
        "description" TEXT NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "user_id" VARCHAR(255) NOT NULL,
        "user_name" VARCHAR(255),
        "user_avatar_url" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_id" ON "activity_logs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_entity" ON "activity_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs" ("user_id");

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20260520000002, 'ActivityLogs20260520000002') ON CONFLICT DO NOTHING;

-- ── Migration: SupabaseAuthColumnNames20260520000004 ──────────────────────────────────────────────

DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'org_members' AND column_name = 'clerk_user_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'org_members' AND column_name = 'auth_user_id'
        ) THEN
          ALTER TABLE org_members RENAME COLUMN "clerk_user_id" TO auth_user_id;
        END IF;
      END $$;;
DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'clerk_org_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'external_auth_org_id'
        ) THEN
          ALTER TABLE organizations RENAME COLUMN "clerk_org_id" TO external_auth_org_id;
        END IF;
      END $$;;
DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tenants' AND column_name = 'clerk_org_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tenants' AND column_name = 'external_auth_org_id'
        ) THEN
          ALTER TABLE tenants RENAME COLUMN "clerk_org_id" TO external_auth_org_id;
        END IF;
      END $$;;
ALTER TABLE org_members    ADD COLUMN IF NOT EXISTS auth_user_id         VARCHAR(255);
ALTER TABLE organizations  ADD COLUMN IF NOT EXISTS external_auth_org_id VARCHAR(255);
ALTER TABLE tenants        ADD COLUMN IF NOT EXISTS external_auth_org_id VARCHAR(255);
DROP INDEX IF EXISTS member_auth_user_idx;
DROP INDEX IF EXISTS org_external_auth_idx;
DROP INDEX IF EXISTS tenant_external_auth_idx;
DROP INDEX IF EXISTS idx_org_members_auth_user_id;
DROP INDEX IF EXISTS idx_organizations_external_auth_org_id;
DROP INDEX IF EXISTS idx_tenants_external_auth_org_id;
CREATE UNIQUE INDEX IF NOT EXISTS member_tenant_user_idx ON org_members (tenant_id, auth_user_id);
CREATE INDEX IF NOT EXISTS member_auth_user_idx ON org_members (auth_user_id);
CREATE INDEX IF NOT EXISTS org_external_auth_idx ON organizations (external_auth_org_id);
CREATE INDEX IF NOT EXISTS tenant_external_auth_idx ON tenants (external_auth_org_id);

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20260520000004, 'SupabaseAuthColumnNames20260520000004') ON CONFLICT DO NOTHING;

-- ── Migration: RLSPolicies20260520000020 ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private_get_tenant_id()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$
        SELECT id
          FROM public.tenants
         WHERE org_id::text = COALESCE(
                 auth.jwt()->'app_metadata'->>'org_id',
                 ''
               )
           AND deleted_at IS NULL
        LIMIT 1;
      $$;
GRANT EXECUTE ON FUNCTION private_get_tenant_id() TO authenticated;
ALTER TABLE "org_members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "org_members";
DROP POLICY IF EXISTS "super_admin_full_access" ON "org_members";
CREATE POLICY "super_admin_full_access" ON "org_members"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "org_members"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "artists" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "artists";
DROP POLICY IF EXISTS "super_admin_full_access" ON "artists";
CREATE POLICY "super_admin_full_access" ON "artists"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "artists"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "works" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "works";
DROP POLICY IF EXISTS "super_admin_full_access" ON "works";
CREATE POLICY "super_admin_full_access" ON "works"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "works"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "phonograms" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "phonograms";
DROP POLICY IF EXISTS "super_admin_full_access" ON "phonograms";
CREATE POLICY "super_admin_full_access" ON "phonograms"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "phonograms"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "contracts";
DROP POLICY IF EXISTS "super_admin_full_access" ON "contracts";
CREATE POLICY "super_admin_full_access" ON "contracts"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "contracts"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "contract_templates" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "contract_templates";
DROP POLICY IF EXISTS "super_admin_full_access" ON "contract_templates";
CREATE POLICY "super_admin_full_access" ON "contract_templates"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "contract_templates"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "transactions";
DROP POLICY IF EXISTS "super_admin_full_access" ON "transactions";
CREATE POLICY "super_admin_full_access" ON "transactions"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "transactions"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "invoices";
DROP POLICY IF EXISTS "super_admin_full_access" ON "invoices";
CREATE POLICY "super_admin_full_access" ON "invoices"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "invoices"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "clients";
DROP POLICY IF EXISTS "super_admin_full_access" ON "clients";
CREATE POLICY "super_admin_full_access" ON "clients"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "clients"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "leads";
DROP POLICY IF EXISTS "super_admin_full_access" ON "leads";
CREATE POLICY "super_admin_full_access" ON "leads"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "leads"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "lead_interactions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "lead_interactions";
DROP POLICY IF EXISTS "super_admin_full_access" ON "lead_interactions";
CREATE POLICY "super_admin_full_access" ON "lead_interactions"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "lead_interactions"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "campaigns";
DROP POLICY IF EXISTS "super_admin_full_access" ON "campaigns";
CREATE POLICY "super_admin_full_access" ON "campaigns"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "campaigns"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "briefings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "briefings";
DROP POLICY IF EXISTS "super_admin_full_access" ON "briefings";
CREATE POLICY "super_admin_full_access" ON "briefings"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "briefings"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "events";
DROP POLICY IF EXISTS "super_admin_full_access" ON "events";
CREATE POLICY "super_admin_full_access" ON "events"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "events"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "projects";
DROP POLICY IF EXISTS "super_admin_full_access" ON "projects";
CREATE POLICY "super_admin_full_access" ON "projects"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "projects"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "releases" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "releases";
DROP POLICY IF EXISTS "super_admin_full_access" ON "releases";
CREATE POLICY "super_admin_full_access" ON "releases"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "releases"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "shares" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "shares";
DROP POLICY IF EXISTS "super_admin_full_access" ON "shares";
CREATE POLICY "super_admin_full_access" ON "shares"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "shares"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "takedowns" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "takedowns";
DROP POLICY IF EXISTS "super_admin_full_access" ON "takedowns";
CREATE POLICY "super_admin_full_access" ON "takedowns"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "takedowns"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "support_tickets";
DROP POLICY IF EXISTS "super_admin_full_access" ON "support_tickets";
CREATE POLICY "super_admin_full_access" ON "support_tickets"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "support_tickets"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "notifications";
DROP POLICY IF EXISTS "super_admin_full_access" ON "notifications";
CREATE POLICY "super_admin_full_access" ON "notifications"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "notifications"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "uploads" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "uploads";
DROP POLICY IF EXISTS "super_admin_full_access" ON "uploads";
CREATE POLICY "super_admin_full_access" ON "uploads"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "uploads"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "integrations";
DROP POLICY IF EXISTS "super_admin_full_access" ON "integrations";
CREATE POLICY "super_admin_full_access" ON "integrations"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "integrations"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "oauth_connections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "oauth_connections";
DROP POLICY IF EXISTS "super_admin_full_access" ON "oauth_connections";
CREATE POLICY "super_admin_full_access" ON "oauth_connections"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "oauth_connections"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "webhook_events";
DROP POLICY IF EXISTS "super_admin_full_access" ON "webhook_events";
CREATE POLICY "super_admin_full_access" ON "webhook_events"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "webhook_events"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "audit_logs";
DROP POLICY IF EXISTS "super_admin_full_access" ON "audit_logs";
CREATE POLICY "super_admin_full_access" ON "audit_logs"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "audit_logs"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "ai_jobs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "ai_jobs";
DROP POLICY IF EXISTS "super_admin_full_access" ON "ai_jobs";
CREATE POLICY "super_admin_full_access" ON "ai_jobs"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "ai_jobs"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "artist_goals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "artist_goals";
DROP POLICY IF EXISTS "super_admin_full_access" ON "artist_goals";
CREATE POLICY "super_admin_full_access" ON "artist_goals"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "artist_goals"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "content_detections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "content_detections";
DROP POLICY IF EXISTS "super_admin_full_access" ON "content_detections";
CREATE POLICY "super_admin_full_access" ON "content_detections"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "content_detections"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "ecad_reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "ecad_reports";
DROP POLICY IF EXISTS "super_admin_full_access" ON "ecad_reports";
CREATE POLICY "super_admin_full_access" ON "ecad_reports"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "ecad_reports"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "employees";
DROP POLICY IF EXISTS "super_admin_full_access" ON "employees";
CREATE POLICY "super_admin_full_access" ON "employees"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "employees"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "payroll_entries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "payroll_entries";
DROP POLICY IF EXISTS "super_admin_full_access" ON "payroll_entries";
CREATE POLICY "super_admin_full_access" ON "payroll_entries"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "payroll_entries"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "leave_requests";
DROP POLICY IF EXISTS "super_admin_full_access" ON "leave_requests";
CREATE POLICY "super_admin_full_access" ON "leave_requests"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "leave_requests"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "workflow_transitions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "workflow_transitions";
DROP POLICY IF EXISTS "super_admin_full_access" ON "workflow_transitions";
CREATE POLICY "super_admin_full_access" ON "workflow_transitions"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "workflow_transitions"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "domain_event_log" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "domain_event_log";
DROP POLICY IF EXISTS "super_admin_full_access" ON "domain_event_log";
CREATE POLICY "super_admin_full_access" ON "domain_event_log"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "domain_event_log"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "activity_logs";
DROP POLICY IF EXISTS "super_admin_full_access" ON "activity_logs";
CREATE POLICY "super_admin_full_access" ON "activity_logs"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "tenant_isolation" ON "activity_logs"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          );
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_isolation" ON "organizations";
DROP POLICY IF EXISTS "super_admin_full_access" ON "organizations";
CREATE POLICY "super_admin_full_access" ON "organizations"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "org_isolation" ON "organizations"
          FOR ALL
          TO authenticated
          USING (
            "id"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          )
          WITH CHECK (
            "id"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          );
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_isolation" ON "tenants";
DROP POLICY IF EXISTS "super_admin_full_access" ON "tenants";
CREATE POLICY "super_admin_full_access" ON "tenants"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "org_isolation" ON "tenants"
          FOR ALL
          TO authenticated
          USING (
            "org_id"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          )
          WITH CHECK (
            "org_id"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          );
ALTER TABLE "billing_subscriptions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_isolation" ON "billing_subscriptions";
DROP POLICY IF EXISTS "super_admin_full_access" ON "billing_subscriptions";
CREATE POLICY "super_admin_full_access" ON "billing_subscriptions"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          );
CREATE POLICY "org_isolation" ON "billing_subscriptions"
          FOR ALL
          TO authenticated
          USING (
            "org_id"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          )
          WITH CHECK (
            "org_id"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          );

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20260520000020, 'RLSPolicies20260520000020') ON CONFLICT DO NOTHING;

-- ── Migration: PerformanceIndexes20260521000030 ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_artists_tenant_active"
        ON "artists" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_works_tenant_active"
        ON "works" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_phonograms_tenant_active"
        ON "phonograms" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_contracts_tenant_active"
        ON "contracts" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_contract_templates_tenant_active"
        ON "contract_templates" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_active"
        ON "transactions" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_active"
        ON "invoices" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_clients_tenant_active"
        ON "clients" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_active"
        ON "leads" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_campaigns_tenant_active"
        ON "campaigns" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_briefings_tenant_active"
        ON "briefings" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_events_tenant_active"
        ON "events" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_projects_tenant_active"
        ON "projects" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_releases_tenant_active"
        ON "releases" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_support_tickets_tenant_active"
        ON "support_tickets" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_uploads_tenant_active"
        ON "uploads" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_artists_status"
      ON "artists" (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_contracts_status"
      ON "contracts" (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_transactions_tipo"
      ON "transactions" (tenant_id, tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_leads_status"
      ON "leads" (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_support_tickets_status"
      ON "support_tickets" (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_ts"
      ON "audit_logs" (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_ts"
      ON "activity_logs" (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_domain_event_log_aggregate"
      ON "domain_event_log" (aggregate_type, aggregate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_webhook_events_pending"
      ON "webhook_events" (provider, status, created_at)
      WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS "idx_billing_subs_org"
      ON "billing_subscriptions" (org_id);
CREATE INDEX IF NOT EXISTS "idx_billing_subs_stripe_customer"
      ON "billing_subscriptions" (stripe_customer_id);
CREATE INDEX IF NOT EXISTS "idx_oauth_tenant_user_provider"
      ON "oauth_connections" (tenant_id, user_id, provider);
CREATE INDEX IF NOT EXISTS "idx_artists_name_trgm"
      ON "artists" USING gin (nome_artistico gin_trgm_ops);

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20260521000030, 'PerformanceIndexes20260521000030') ON CONFLICT DO NOTHING;

-- ── Migration: ConversationsAndForms20260521000040 ──────────────────────────────────────────────

CREATE TYPE conversation_status  AS ENUM ('open', 'pending', 'closed', 'spam');
      CREATE TYPE conversation_channel AS ENUM ('internal', 'email', 'whatsapp', 'telegram', 'instagram', 'sms', 'discord');
      CREATE TYPE message_sender_type  AS ENUM ('user', 'contact', 'system', 'ai');
      CREATE TYPE form_status          AS ENUM ('draft', 'active', 'archived');;
CREATE TABLE conversations (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        contact_id      UUID        REFERENCES leads(id)  ON DELETE SET NULL,
        subject         TEXT        NOT NULL DEFAULT '',
        status          conversation_status  NOT NULL DEFAULT 'open',
        channel         conversation_channel NOT NULL DEFAULT 'internal',
        assigned_to     TEXT,
        last_message_at TIMESTAMPTZ,
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_by      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      );
      CREATE INDEX idx_conversations_tenant_status ON conversations (tenant_id, status) WHERE deleted_at IS NULL;
      CREATE INDEX idx_conversations_assigned      ON conversations (assigned_to)       WHERE deleted_at IS NULL;
      CREATE INDEX idx_conversations_contact       ON conversations (contact_id)        WHERE deleted_at IS NULL;;
CREATE TABLE conversation_messages (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        tenant_id       UUID        NOT NULL,
        body            TEXT        NOT NULL DEFAULT '',
        sender_id       TEXT        NOT NULL,
        sender_type     message_sender_type NOT NULL DEFAULT 'user',
        attachments     JSONB       NOT NULL DEFAULT '[]',
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_conv_messages_conv   ON conversation_messages (conversation_id, created_at DESC);
      CREATE INDEX idx_conv_messages_tenant ON conversation_messages (tenant_id);;
CREATE TABLE conversation_notes (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        tenant_id       UUID        NOT NULL,
        body            TEXT        NOT NULL DEFAULT '',
        author_id       TEXT        NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_conv_notes_conv ON conversation_notes (conversation_id, created_at DESC);;
CREATE TABLE forms (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT        NOT NULL,
        description TEXT,
        fields      JSONB       NOT NULL DEFAULT '[]',
        settings    JSONB       NOT NULL DEFAULT '{}',
        status      form_status NOT NULL DEFAULT 'draft',
        submission_count INT    NOT NULL DEFAULT 0,
        created_by  TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      );
      CREATE INDEX idx_forms_tenant_status ON forms (tenant_id, status) WHERE deleted_at IS NULL;;
CREATE TABLE form_submissions (
        id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id   UUID        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
        tenant_id UUID        NOT NULL,
        lead_id   UUID        REFERENCES leads(id) ON DELETE SET NULL,
        data      JSONB       NOT NULL DEFAULT '{}',
        origin    TEXT,
        ip        TEXT,
        metadata  JSONB       NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_form_submissions_form   ON form_submissions (form_id, created_at DESC);
      CREATE INDEX idx_form_submissions_tenant ON form_submissions (tenant_id);
      CREATE INDEX idx_form_submissions_lead   ON form_submissions (lead_id) WHERE lead_id IS NOT NULL;;
ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_notes    ENABLE ROW LEVEL SECURITY;
      ALTER TABLE forms                 ENABLE ROW LEVEL SECURITY;
      ALTER TABLE form_submissions      ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON conversations
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
      CREATE POLICY tenant_isolation ON conversation_messages
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
      CREATE POLICY tenant_isolation ON conversation_notes
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
      CREATE POLICY tenant_isolation ON forms
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
      CREATE POLICY tenant_isolation ON form_submissions
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);;

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20260521000040, 'ConversationsAndForms20260521000040') ON CONFLICT DO NOTHING;

-- ── Migration: CrmPipelinesAnalytics20260521000050 ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_companies (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        name          VARCHAR(255) NOT NULL,
        industry      VARCHAR(100),
        website       VARCHAR(255),
        email_encrypted TEXT,
        phone_encrypted TEXT,
        address       VARCHAR(255),
        city          VARCHAR(100),
        state         CHAR(2),
        contact_count INTEGER NOT NULL DEFAULT 0,
        metadata      JSONB NOT NULL DEFAULT '{}',
        created_by    VARCHAR(255),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at    TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant ON crm_companies (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant_deleted ON crm_companies (tenant_id, deleted_at);;
CREATE TABLE IF NOT EXISTS crm_contacts (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id         UUID NOT NULL,
        name              VARCHAR(255) NOT NULL,
        email_encrypted   TEXT,
        phone_encrypted   TEXT,
        job_title         VARCHAR(255),
        company_id        UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
        source            VARCHAR(100),
        score             INTEGER NOT NULL DEFAULT 0,
        status            VARCHAR(50) NOT NULL DEFAULT 'active',
        lead_id           UUID,
        client_id         UUID,
        assigned_to       VARCHAR(255),
        last_contacted_at TIMESTAMPTZ,
        social_links      JSONB NOT NULL DEFAULT '{}',
        metadata          JSONB NOT NULL DEFAULT '{}',
        created_by        VARCHAR(255),
        updated_by        VARCHAR(255),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at        TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm_contacts (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_deleted ON crm_contacts (tenant_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts (tenant_id, company_id);;
CREATE TABLE IF NOT EXISTS crm_tags (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID NOT NULL,
        name       VARCHAR(100) NOT NULL,
        color      VARCHAR(50) NOT NULL DEFAULT '#6366f1',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, name)
      );;
CREATE TABLE IF NOT EXISTS crm_contact_tags (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID NOT NULL,
        contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
        tag_id     UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (contact_id, tag_id)
      );
      CREATE INDEX IF NOT EXISTS idx_crm_contact_tags_tenant ON crm_contact_tags (tenant_id);;
CREATE TABLE IF NOT EXISTS crm_tasks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        title        VARCHAR(500) NOT NULL,
        description  TEXT,
        status       VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority     VARCHAR(50) NOT NULL DEFAULT 'medium',
        type         VARCHAR(100),
        contact_id   UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
        company_id   UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
        assigned_to  VARCHAR(255),
        due_date     TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_by   VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact ON crm_tasks (tenant_id, contact_id);
      CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks (tenant_id, due_date);
      CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee ON crm_tasks (assigned_to);;
CREATE TABLE IF NOT EXISTS crm_timeline_events (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL,
        contact_id  UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
        event_type  VARCHAR(100) NOT NULL,
        summary     VARCHAR(500),
        payload     JSONB NOT NULL DEFAULT '{}',
        actor_id    VARCHAR(255),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_crm_timeline_contact ON crm_timeline_events (tenant_id, contact_id, occurred_at);;
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_companies
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_contacts
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_tags
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE crm_contact_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_contact_tags
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_tasks
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE crm_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_timeline_events
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
CREATE TABLE IF NOT EXISTS pipelines (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL,
        name        VARCHAR(255) NOT NULL,
        type        VARCHAR(100) NOT NULL DEFAULT 'sales',
        description TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_by  VARCHAR(255),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines (tenant_id);;
CREATE TABLE IF NOT EXISTS pipeline_stages (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        name            VARCHAR(255) NOT NULL,
        position        INTEGER NOT NULL DEFAULT 0,
        color           VARCHAR(50) NOT NULL DEFAULT '#6366f1',
        sla_days        INTEGER,
        win_probability DECIMAL(5,2),
        is_terminal     BOOLEAN NOT NULL DEFAULT FALSE,
        is_won          BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages (pipeline_id, position);
      CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON pipeline_stages (tenant_id);;
CREATE TABLE IF NOT EXISTS pipeline_opportunities (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id          UUID NOT NULL,
        pipeline_id        UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        stage_id           UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
        title              VARCHAR(500) NOT NULL,
        contact_id         UUID,
        company_id         UUID,
        value              DECIMAL(15,2),
        status             VARCHAR(50) NOT NULL DEFAULT 'open',
        probability        DECIMAL(5,2),
        expected_close_date TIMESTAMPTZ,
        actual_close_date  TIMESTAMPTZ,
        sla_due_at         TIMESTAMPTZ,
        sla_breached       BOOLEAN NOT NULL DEFAULT FALSE,
        assigned_to        VARCHAR(255),
        notes              TEXT,
        stage_history      JSONB NOT NULL DEFAULT '[]',
        metadata           JSONB NOT NULL DEFAULT '{}',
        created_by         VARCHAR(255),
        updated_by         VARCHAR(255),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at         TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_opp_pipeline ON pipeline_opportunities (tenant_id, pipeline_id);
      CREATE INDEX IF NOT EXISTS idx_opp_stage ON pipeline_opportunities (tenant_id, stage_id);
      CREATE INDEX IF NOT EXISTS idx_opp_contact ON pipeline_opportunities (tenant_id, contact_id);
      CREATE INDEX IF NOT EXISTS idx_opp_deleted ON pipeline_opportunities (tenant_id, deleted_at);;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pipelines
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pipeline_stages
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE pipeline_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pipeline_opportunities
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
CREATE TABLE IF NOT EXISTS campaign_tasks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        title        VARCHAR(500) NOT NULL,
        description  TEXT,
        status       VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority     VARCHAR(50) NOT NULL DEFAULT 'medium',
        assigned_to  VARCHAR(255),
        due_date     TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_by   VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_campaign_tasks_campaign ON campaign_tasks (tenant_id, campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_tasks_due ON campaign_tasks (tenant_id, due_date);
      CREATE INDEX IF NOT EXISTS idx_campaign_tasks_assignee ON campaign_tasks (assigned_to);;
CREATE TABLE IF NOT EXISTS campaign_assets (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name         VARCHAR(500) NOT NULL,
        asset_type   VARCHAR(100) NOT NULL,
        file_url     TEXT NOT NULL,
        file_size    BIGINT,
        mime_type    VARCHAR(100),
        description  TEXT,
        metadata     JSONB NOT NULL DEFAULT '{}',
        created_by   VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at   TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign ON campaign_assets (tenant_id, campaign_id);;
ALTER TABLE campaign_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON campaign_tasks
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
ALTER TABLE campaign_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON campaign_assets
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        job_id       UUID,
        model        VARCHAR(255) NOT NULL,
        feature      VARCHAR(100) NOT NULL,
        tokens_input  INTEGER NOT NULL DEFAULT 0,
        tokens_output INTEGER NOT NULL DEFAULT 0,
        cost_usd     DECIMAL(12,6) NOT NULL DEFAULT 0,
        latency_ms   INTEGER,
        outcome      VARCHAR(50) NOT NULL DEFAULT 'success',
        user_id      VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON ai_usage_logs (tenant_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs (tenant_id, model);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_job ON ai_usage_logs (job_id);;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_usage_logs
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

INSERT INTO "musicos360_migrations" ("timestamp", "name") VALUES (20260521000050, 'CrmPipelinesAnalytics20260521000050') ON CONFLICT DO NOTHING;

-- ============================================================
-- All migrations applied successfully
-- ============================================================
