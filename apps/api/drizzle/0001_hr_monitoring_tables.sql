CREATE TABLE "artist_goals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "artista_id" uuid NOT NULL,
        "titulo" varchar(255) NOT NULL,
        "tipo" varchar(100) NOT NULL,
        "meta_valor" numeric(15, 2),
        "valor_atual" numeric(15, 2) DEFAULT '0' NOT NULL,
        "status" varchar(50) DEFAULT 'em_andamento' NOT NULL,
        "periodo" varchar(50) DEFAULT 'mensal' NOT NULL,
        "data_inicio" timestamp,
        "data_fim" timestamp,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        "created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "content_detections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "obra_id" uuid,
        "artista_id" uuid,
        "plataforma" varchar(100) NOT NULL,
        "titulo_detectado" varchar(500),
        "url" text,
        "score" numeric(5, 4),
        "status" varchar(50) DEFAULT 'pendente' NOT NULL,
        "tipo" varchar(100) DEFAULT 'uso_nao_autorizado' NOT NULL,
        "detectado_em" timestamp DEFAULT now(),
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ecad_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "obra_id" uuid,
        "periodo" varchar(20) NOT NULL,
        "tipo" varchar(100) NOT NULL,
        "valor_bruto" numeric(15, 2),
        "valor_liquido" numeric(15, 2),
        "status" varchar(50) DEFAULT 'pendente' NOT NULL,
        "arquivo_url" text,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        "created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "employees" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "nome" varchar(255) NOT NULL,
        "cargo" varchar(255),
        "departamento" varchar(100),
        "tipo_contrato" varchar(100) DEFAULT 'clt' NOT NULL,
        "status" varchar(50) DEFAULT 'ativo' NOT NULL,
        "email_encrypted" text,
        "telefone_encrypted" text,
        "cpf_encrypted" text,
        "salario" numeric(15, 2),
        "data_admissao" timestamp,
        "data_demissao" timestamp,
        "documentos" jsonb DEFAULT '[]'::jsonb,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        "created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "competencia" varchar(7) NOT NULL,
        "salario_bruto" numeric(15, 2) NOT NULL,
        "descontos" numeric(15, 2) DEFAULT '0' NOT NULL,
        "salario_liquido" numeric(15, 2) NOT NULL,
        "status" varchar(50) DEFAULT 'pendente' NOT NULL,
        "arquivo_url" text,
        "pago_em" timestamp,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "tipo" varchar(100) NOT NULL,
        "status" varchar(50) DEFAULT 'pendente' NOT NULL,
        "data_inicio" timestamp NOT NULL,
        "data_fim" timestamp NOT NULL,
        "motivo" text,
        "aprovado_por" varchar(255),
        "documento_url" text,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        "created_by" varchar(255)
);
--> statement-breakpoint
CREATE INDEX "artist_goals_tenant_idx" ON "artist_goals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "artist_goals_artista_idx" ON "artist_goals" USING btree ("artista_id");--> statement-breakpoint
CREATE INDEX "detections_tenant_idx" ON "content_detections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "detections_status_idx" ON "content_detections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ecad_reports_tenant_idx" ON "ecad_reports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ecad_reports_periodo_idx" ON "ecad_reports" USING btree ("periodo");--> statement-breakpoint
CREATE INDEX "employees_tenant_idx" ON "employees" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "employees_status_idx" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payroll_tenant_idx" ON "payroll_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payroll_employee_idx" ON "payroll_entries" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_competencia_idx" ON "payroll_entries" USING btree ("employee_id","competencia");--> statement-breakpoint
CREATE INDEX "leave_tenant_idx" ON "leave_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "leave_employee_idx" ON "leave_requests" USING btree ("employee_id");--> statement-breakpoint
ALTER TABLE "artist_goals" ADD CONSTRAINT "artist_goals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_goals" ADD CONSTRAINT "artist_goals_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_detections" ADD CONSTRAINT "content_detections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_detections" ADD CONSTRAINT "content_detections_obra_id_works_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_detections" ADD CONSTRAINT "content_detections_artista_id_artists_id_fk" FOREIGN KEY ("artista_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecad_reports" ADD CONSTRAINT "ecad_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecad_reports" ADD CONSTRAINT "ecad_reports_obra_id_works_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
