CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"skill" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 8) DEFAULT '0' NOT NULL,
	"latency_ms" integer,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nome_artistico" varchar(255) NOT NULL,
	"nome_civil" varchar(255),
	"tipo" varchar(50) DEFAULT 'solo' NOT NULL,
	"status" varchar(50) DEFAULT 'em_negociacao' NOT NULL,
	"status_cadastro" varchar(50) DEFAULT 'ativo' NOT NULL,
	"genero_musical" varchar(100),
	"email_encrypted" text,
	"telefone_encrypted" text,
	"cpf_cnpj_encrypted" text,
	"foto_url" text,
	"galeria_urls" jsonb DEFAULT '[]'::jsonb,
	"documentos" jsonb DEFAULT '[]'::jsonb,
	"observacoes" text,
	"manager_nome" varchar(255),
	"manager_contato_encrypted" text,
	"produtor_executivo" varchar(255),
	"agencia_booking" varchar(255),
	"label_parceira" varchar(255),
	"especialidades" jsonb DEFAULT '[]'::jsonb,
	"spotify_artist_id" varchar(255),
	"youtube_channel_id" varchar(255),
	"deezer_url" text,
	"apple_music_url" text,
	"soundcloud_url" text,
	"contrato_id" uuid,
	"org_slug" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" varchar(255),
	"action" varchar(100) NOT NULL,
	"entity" varchar(100) NOT NULL,
	"entity_id" varchar(255),
	"before" jsonb,
	"after" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_sub_id" varchar(255),
	"plan" varchar(50) DEFAULT 'starter' NOT NULL,
	"status" varchar(50) DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_end" timestamp,
	"seats" integer DEFAULT 3 NOT NULL,
	"seats_used" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "billing_subscriptions_stripe_sub_id_unique" UNIQUE("stripe_sub_id")
);
--> statement-breakpoint
CREATE TABLE "briefings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"artista_id" uuid,
	"campanha_id" uuid,
	"status" varchar(50) DEFAULT 'rascunho' NOT NULL,
	"prazo" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'rascunho' NOT NULL,
	"objetivo" text,
	"orcamento" numeric(15, 2),
	"data_inicio" timestamp,
	"data_fim" timestamp,
	"artista_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"segmento" varchar(100),
	"tipo_pessoa" varchar(50) DEFAULT 'pessoa_juridica' NOT NULL,
	"cpf_cnpj_encrypted" text,
	"responsavel" varchar(255),
	"email_encrypted" text,
	"telefone_encrypted" text,
	"endereco" varchar(500),
	"cidade" varchar(100),
	"estado" varchar(2),
	"status" varchar(50) DEFAULT 'ativo' NOT NULL,
	"observacoes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(500) NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"conteudo" text NOT NULL,
	"variaveis" jsonb DEFAULT '[]'::jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(500) NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'rascunho' NOT NULL,
	"artista_id" uuid,
	"cliente_id" uuid,
	"lancamento_id" uuid,
	"data_inicio" timestamp,
	"data_fim" timestamp,
	"valor" numeric(15, 2),
	"exclusivo" boolean DEFAULT false NOT NULL,
	"observacoes" text,
	"arquivo_url" text,
	"autentique_doc_id" varchar(255),
	"signing_platform" varchar(100),
	"versoes" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'agendado' NOT NULL,
	"data" timestamp NOT NULL,
	"local" varchar(255),
	"artista_id" uuid,
	"valor" numeric(15, 2),
	"observacoes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'disconnected' NOT NULL,
	"credentials_encrypted" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"last_sync_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"numero" varchar(100),
	"tipo" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"prestador_id" uuid,
	"tomador_nome" varchar(255),
	"tomador_doc_encrypted" text,
	"valor" numeric(15, 2) NOT NULL,
	"descricao" text,
	"data_emissao" timestamp,
	"data_vencimento" timestamp,
	"arquivo_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "lead_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"descricao" text,
	"data" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cliente_id" uuid,
	"nome" varchar(255) NOT NULL,
	"email_encrypted" text,
	"telefone_encrypted" text,
	"empresa" varchar(255),
	"status" varchar(50) DEFAULT 'novo' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"fonte" varchar(100),
	"pipeline_stage" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"type" varchar(100) NOT NULL,
	"entity" varchar(100),
	"entity_id" varchar(255),
	"read_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"expires_at" timestamp,
	"scopes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"auth_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"role" varchar(50) DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_auth_org_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"plan" varchar(50) DEFAULT 'starter' NOT NULL,
	"billing_status" varchar(50) DEFAULT 'trial' NOT NULL,
	"industry" varchar(100) DEFAULT 'gravadora' NOT NULL,
	"cnpj_encrypted" text,
	"phone" varchar(50),
	"address" jsonb DEFAULT '{}'::jsonb,
	"config" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organizations_external_auth_org_id_unique" UNIQUE("external_auth_org_id"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "phonograms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(500) NOT NULL,
	"obra_id" uuid,
	"artista_id" uuid,
	"isrc" varchar(20),
	"duracao" varchar(20),
	"tipo" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"compositores" text,
	"interpretes" text,
	"produtores" text,
	"gravadora" varchar(255),
	"cod_abramus" varchar(100),
	"cod_ecad" varchar(100),
	"origem_externa" varchar(100),
	"origem_externa_id" varchar(255),
	"origem_externa_sincronizado_em" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'planejamento' NOT NULL,
	"artista_id" uuid,
	"data_inicio" timestamp,
	"data_fim" timestamp,
	"orcamento" numeric(15, 2),
	"descricao" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"artista_id" uuid,
	"titulo" varchar(500) NOT NULL,
	"tipo" varchar(100) DEFAULT 'single' NOT NULL,
	"status" varchar(50) DEFAULT 'planejamento' NOT NULL,
	"distribuidora" varchar(255),
	"upc" varchar(20),
	"data_lancamento" timestamp,
	"plataformas" jsonb DEFAULT '[]'::jsonb,
	"capa_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"obra_id" uuid,
	"fonograma_id" uuid,
	"titular_nome" varchar(255) NOT NULL,
	"titular_doc" varchar(50),
	"papel" varchar(100) DEFAULT 'autor' NOT NULL,
	"percentual" numeric(7, 4) NOT NULL,
	"status" varchar(50) DEFAULT 'ativo' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ticket_number" varchar(50) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"priority" varchar(50) DEFAULT 'medium' NOT NULL,
	"category" varchar(100),
	"created_by" varchar(255) NOT NULL,
	"assigned_to" varchar(255),
	"sla_deadline" timestamp,
	"resolved_at" timestamp,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "takedowns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"plataforma" varchar(100) NOT NULL,
	"url" text,
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"obra_id" uuid,
	"artista_id" uuid,
	"motivo" text,
	"resposta" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"external_auth_org_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"plan" varchar(50) DEFAULT 'starter' NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "tenants_external_auth_org_id_unique" UNIQUE("external_auth_org_id"),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"categoria" varchar(100) NOT NULL,
	"descricao" text,
	"valor" numeric(15, 2) NOT NULL,
	"data" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"artista_id" uuid,
	"contrato_id" uuid,
	"projeto_id" uuid,
	"referencia" varchar(255),
	"comprovante_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"file_id" varchar(255) NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" integer NOT NULL,
	"r2_key" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"entity" varchar(100),
	"entity_id" varchar(255),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "uploads_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"provider" varchar(100) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"external_id" varchar(255),
	"payload" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(500) NOT NULL,
	"compositor" varchar(255),
	"compositores" text,
	"co_compositores" text,
	"detentores" text,
	"editora" varchar(255),
	"isrc" varchar(20),
	"iswc" varchar(20),
	"cod_abramus" varchar(100),
	"cod_ecad" varchar(100),
	"tipo" varchar(100) NOT NULL,
	"genero" varchar(100),
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"duracao" varchar(20),
	"origem_externa" varchar(100),
	"origem_externa_id" varchar(255),
	"origem_externa_sincronizado_em" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_campanha_id_campaigns_id_fk" FOREIGN KEY ("campanha_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_interactions" ADD CONSTRAINT "lead_interactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_interactions" ADD CONSTRAINT "lead_interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_cliente_id_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phonograms" ADD CONSTRAINT "phonograms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phonograms" ADD CONSTRAINT "phonograms_obra_id_works_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phonograms" ADD CONSTRAINT "phonograms_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_obra_id_works_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_fonograma_id_phonograms_id_fk" FOREIGN KEY ("fonograma_id") REFERENCES "public"."phonograms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takedowns" ADD CONSTRAINT "takedowns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takedowns" ADD CONSTRAINT "takedowns_obra_id_works_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takedowns" ADD CONSTRAINT "takedowns_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contrato_id_contracts_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_jobs_tenant_idx" ON "ai_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_created_idx" ON "ai_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "artists_tenant_idx" ON "artists" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "artists_tenant_status_idx" ON "artists" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "artists_tenant_deleted_idx" ON "artists" USING btree ("tenant_id","deleted_at");--> statement-breakpoint
CREATE INDEX "audit_tenant_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_tenant_entity_idx" ON "audit_logs" USING btree ("tenant_id","entity");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "billing_org_idx" ON "billing_subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "briefings_tenant_idx" ON "briefings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "campaigns_tenant_idx" ON "campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "clients_tenant_idx" ON "clients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "clients_tenant_status_idx" ON "clients" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "contract_templates_tenant_idx" ON "contract_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contracts_tenant_idx" ON "contracts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contracts_tenant_status_idx" ON "contracts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "contracts_artista_idx" ON "contracts" USING btree ("artista_id");--> statement-breakpoint
CREATE INDEX "contracts_data_fim_idx" ON "contracts" USING btree ("data_fim");--> statement-breakpoint
CREATE INDEX "events_tenant_idx" ON "events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "events_tenant_data_idx" ON "events" USING btree ("tenant_id","data");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_tenant_provider_idx" ON "integrations" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "invoices_tenant_idx" ON "invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_status_idx" ON "invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "lead_int_tenant_idx" ON "lead_interactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lead_int_lead_idx" ON "lead_interactions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "leads_tenant_idx" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "leads_tenant_status_idx" ON "leads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "leads_cliente_idx" ON "leads" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "notif_tenant_user_idx" ON "notifications" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "notif_tenant_user_read_idx" ON "notifications" USING btree ("tenant_id","user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_tenant_user_provider_idx" ON "oauth_connections" USING btree ("tenant_id","user_id","provider");--> statement-breakpoint
CREATE INDEX "oauth_tenant_idx" ON "oauth_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_tenant_user_idx" ON "org_members" USING btree ("tenant_id","auth_user_id");--> statement-breakpoint
CREATE INDEX "member_tenant_idx" ON "org_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "member_auth_user_idx" ON "org_members" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "org_external_auth_idx" ON "organizations" USING btree ("external_auth_org_id");--> statement-breakpoint
CREATE INDEX "org_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "phonograms_tenant_idx" ON "phonograms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "phonograms_obra_idx" ON "phonograms" USING btree ("obra_id");--> statement-breakpoint
CREATE INDEX "phonograms_artista_idx" ON "phonograms" USING btree ("artista_id");--> statement-breakpoint
CREATE INDEX "phonograms_isrc_idx" ON "phonograms" USING btree ("isrc");--> statement-breakpoint
CREATE INDEX "projects_tenant_idx" ON "projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "releases_tenant_idx" ON "releases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "releases_artista_idx" ON "releases" USING btree ("artista_id");--> statement-breakpoint
CREATE INDEX "shares_tenant_idx" ON "shares" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shares_obra_idx" ON "shares" USING btree ("obra_id");--> statement-breakpoint
CREATE INDEX "tickets_tenant_idx" ON "support_tickets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "takedowns_tenant_idx" ON "takedowns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "takedowns_tenant_status_idx" ON "takedowns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "tenant_external_auth_idx" ON "tenants" USING btree ("external_auth_org_id");--> statement-breakpoint
CREATE INDEX "tenant_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenant_org_idx" ON "tenants" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_idx" ON "transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_data_idx" ON "transactions" USING btree ("tenant_id","data");--> statement-breakpoint
CREATE INDEX "transactions_artista_idx" ON "transactions" USING btree ("artista_id");--> statement-breakpoint
CREATE INDEX "uploads_tenant_idx" ON "uploads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "uploads_file_id_idx" ON "uploads" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "uploads_entity_idx" ON "uploads" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "webhook_provider_idx" ON "webhook_events" USING btree ("provider","event_type");--> statement-breakpoint
CREATE INDEX "webhook_status_idx" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "works_tenant_idx" ON "works" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "works_tenant_status_idx" ON "works" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "works_isrc_idx" ON "works" USING btree ("isrc");--> statement-breakpoint
CREATE INDEX "works_iswc_idx" ON "works" USING btree ("iswc");
