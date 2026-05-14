# MUSIC OS 360° — CORREÇÕES V5 — EXECUÇÃO AUTÔNOMA

Execute cada etapa na ordem apresentada. Não pule nenhuma.
Se um passo falhar, corrija o erro antes de continuar.
Todos os caminhos são relativos à raiz do projeto.

---

## ETAPA 1 — CORRIGIR HrService (bug crítico de criptografia)

### PROBLEMA
O `HrService` atualmente espera que o frontend envie campos
`email_encrypted`, `telefone_encrypted`, `cpf_encrypted` já criptografados.
Isso é impossível — o frontend não tem a `ENCRYPTION_KEY`.
O serviço precisa receber campos em texto claro e criptografar server-side.

### 1.1 — Substituir apps/api/src/modules/hr/dto/create-employee.dto.ts

Criar o arquivo com o conteúdo exato abaixo (campos em texto claro, sem `_encrypted`):

```typescript
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  nome: string;

  @IsOptional() @IsString()
  cargo?: string;

  @IsOptional() @IsString()
  departamento?: string;

  @IsOptional() @IsString()
  tipo_contrato?: string;

  @IsOptional() @IsString()
  status?: string;

  // Campos sensíveis chegam em texto claro — o service criptografa
  @IsOptional() @IsString()
  email?: string;

  @IsOptional() @IsString()
  telefone?: string;

  @IsOptional() @IsString()
  cpf?: string;

  @IsOptional() @IsString()
  salario?: string;

  @IsOptional() @IsDateString()
  data_admissao?: string;

  @IsOptional() @IsDateString()
  data_demissao?: string;

  @IsOptional()
  documentos?: unknown[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
```

### 1.2 — Substituir apps/api/src/modules/hr/dto/update-employee.dto.ts

```typescript
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional() @IsString()
  nome?: string;

  @IsOptional() @IsString()
  cargo?: string;

  @IsOptional() @IsString()
  departamento?: string;

  @IsOptional() @IsString()
  tipo_contrato?: string;

  @IsOptional() @IsString()
  status?: string;

  // Campos sensíveis chegam em texto claro — o service criptografa
  @IsOptional() @IsString()
  email?: string;

  @IsOptional() @IsString()
  telefone?: string;

  @IsOptional() @IsString()
  cpf?: string;

  @IsOptional() @IsString()
  salario?: string;

  @IsOptional() @IsDateString()
  data_admissao?: string;

  @IsOptional() @IsDateString()
  data_demissao?: string;

  @IsOptional()
  documentos?: unknown[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
```

### 1.3 — Substituir apps/api/src/modules/hr/hr.service.ts COMPLETAMENTE

O novo service injeta `EncryptionService` (disponível globalmente via `CoreModule @Global()`),
criptografa no `create`/`update` e descriptografa ao retornar:

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, count }          from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }                 from '../../database/database.module';
import { EncryptionService }                     from '../../core/security/encryption.service';
import {
  employees,   Employee,
  payrollEntries, PayrollEntry,
  leaveRequests,  LeaveRequest,
} from '../../database/schema';
import { CreateEmployeeDto }     from './dto/create-employee.dto';
import { UpdateEmployeeDto }     from './dto/update-employee.dto';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Injectable()
export class HrService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly enc: EncryptionService,
  ) {}

  // ── helpers ────────────────────────────────────────────────────────────────

  private mapEmployee(e: Employee) {
    return {
      ...e,
      email:    this.enc.decryptNullable(e.email_encrypted),
      telefone: this.enc.decryptNullable(e.telefone_encrypted),
      cpf:      this.enc.decryptNullable(e.cpf_encrypted),
      // Nunca expor os campos raw criptografados
      email_encrypted:    undefined,
      telefone_encrypted: undefined,
      cpf_encrypted:      undefined,
    };
  }

  // ── Employees ──────────────────────────────────────────────────────────────

  async listEmployees(tenantId: string, query: { status?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(employees.tenant_id, tenantId), isNull(employees.deleted_at)];
    if (query.status) conds.push(eq(employees.status, query.status));
    const where = and(...conds);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(employees).where(where)
        .orderBy(desc(employees.created_at))
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(employees).where(where),
    ]);

    return {
      data: rows.map((e) => this.mapEmployee(e)),
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findEmployee(tenantId: string, id: string) {
    const [result] = await this.db
      .select().from(employees)
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id), isNull(employees.deleted_at)))
      .limit(1);

    if (!result) throw new NotFoundException('Funcionário não encontrado');
    return this.mapEmployee(result);
  }

  async createEmployee(tenantId: string, userId: string, dto: CreateEmployeeDto) {
    const [created] = await this.db
      .insert(employees)
      .values({
        tenant_id:          tenantId,
        nome:               dto.nome,
        cargo:              dto.cargo              ?? null,
        departamento:       dto.departamento       ?? null,
        tipo_contrato:      dto.tipo_contrato      ?? 'clt',
        status:             dto.status             ?? 'ativo',
        // Criptografar server-side
        email_encrypted:    this.enc.encryptNullable(dto.email),
        telefone_encrypted: this.enc.encryptNullable(dto.telefone),
        cpf_encrypted:      this.enc.encryptNullable(dto.cpf),
        salario:            dto.salario            ?? null,
        data_admissao:      dto.data_admissao      ? new Date(dto.data_admissao) : null,
        data_demissao:      dto.data_demissao      ? new Date(dto.data_demissao) : null,
        documentos:         dto.documentos         ?? [],
        metadata:           dto.metadata           ?? {},
        created_by:         userId,
      })
      .returning();

    return this.mapEmployee(created);
  }

  async updateEmployee(tenantId: string, userId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findEmployee(tenantId, id);

    const [updated] = await this.db
      .update(employees)
      .set({
        ...(dto.nome          != null && { nome:          dto.nome }),
        ...(dto.cargo         != null && { cargo:         dto.cargo }),
        ...(dto.departamento  != null && { departamento:  dto.departamento }),
        ...(dto.tipo_contrato != null && { tipo_contrato: dto.tipo_contrato }),
        ...(dto.status        != null && { status:        dto.status }),
        ...(dto.salario       != null && { salario:       dto.salario }),
        ...(dto.documentos    != null && { documentos:    dto.documentos }),
        ...(dto.metadata      != null && { metadata:      dto.metadata }),
        ...(dto.data_admissao != null && { data_admissao: new Date(dto.data_admissao) }),
        ...(dto.data_demissao != null && { data_demissao: new Date(dto.data_demissao) }),
        // Criptografar server-side (undefined = não alterar; null = limpar)
        ...(dto.email    !== undefined && { email_encrypted:    this.enc.encryptNullable(dto.email) }),
        ...(dto.telefone !== undefined && { telefone_encrypted: this.enc.encryptNullable(dto.telefone) }),
        ...(dto.cpf      !== undefined && { cpf_encrypted:      this.enc.encryptNullable(dto.cpf) }),
        updated_at: new Date(),
      })
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id), isNull(employees.deleted_at)))
      .returning();

    return this.mapEmployee(updated);
  }

  async softDeleteEmployee(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findEmployee(tenantId, id);
    await this.db
      .update(employees)
      .set({ deleted_at: new Date() })
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id)));
    return { deleted: true };
  }

  // ── Payroll ────────────────────────────────────────────────────────────────

  async listPayroll(tenantId: string, query: { employee_id?: string; competencia?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(payrollEntries.tenant_id, tenantId), isNull(payrollEntries.deleted_at)];
    if (query.employee_id) conds.push(eq(payrollEntries.employee_id, query.employee_id));
    if (query.competencia) conds.push(eq(payrollEntries.competencia, query.competencia));
    const where = and(...conds);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(payrollEntries).where(where)
        .orderBy(desc(payrollEntries.created_at))
        .offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(payrollEntries).where(where),
    ]);

    return { data: rows, meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async createPayroll(tenantId: string, dto: CreatePayrollEntryDto): Promise<PayrollEntry> {
    const [created] = await this.db
      .insert(payrollEntries)
      .values({
        tenant_id:       tenantId,
        employee_id:     dto.employee_id,
        competencia:     dto.competencia,
        salario_bruto:   dto.salario_bruto,
        descontos:       dto.descontos       ?? '0',
        salario_liquido: dto.salario_liquido,
        status:          dto.status          ?? 'pendente',
        arquivo_url:     dto.arquivo_url     ?? null,
        pago_em:         dto.pago_em         ? new Date(dto.pago_em) : null,
        metadata:        dto.metadata        ?? {},
      })
      .returning();
    return created;
  }

  // ── Leave Requests ─────────────────────────────────────────────────────────

  async listLeaveRequests(tenantId: string, query: { employee_id?: string; status?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(leaveRequests.tenant_id, tenantId), isNull(leaveRequests.deleted_at)];
    if (query.employee_id) conds.push(eq(leaveRequests.employee_id, query.employee_id));
    if (query.status)      conds.push(eq(leaveRequests.status, query.status));
    const where = and(...conds);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(leaveRequests).where(where)
        .orderBy(desc(leaveRequests.created_at))
        .offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(leaveRequests).where(where),
    ]);

    return { data: rows, meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async createLeaveRequest(tenantId: string, userId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const [created] = await this.db
      .insert(leaveRequests)
      .values({
        tenant_id:     tenantId,
        employee_id:   dto.employee_id,
        tipo:          dto.tipo,
        data_inicio:   new Date(dto.data_inicio),
        data_fim:      new Date(dto.data_fim),
        status:        dto.status        ?? 'pendente',
        motivo:        dto.motivo        ?? null,
        aprovado_por:  dto.aprovado_por  ?? null,
        documento_url: dto.documento_url ?? null,
        metadata:      dto.metadata      ?? {},
        created_by:    userId,
      })
      .returning();
    return created;
  }

  async approveLeaveRequest(tenantId: string, id: string, userId: string): Promise<LeaveRequest> {
    const [updated] = await this.db
      .update(leaveRequests)
      .set({ status: 'aprovado', aprovado_por: userId, updated_at: new Date() })
      .where(and(eq(leaveRequests.tenant_id, tenantId), eq(leaveRequests.id, id), isNull(leaveRequests.deleted_at)))
      .returning();

    if (!updated) throw new NotFoundException('Afastamento não encontrado');
    return updated;
  }
}
```

### 1.4 — Atualizar apps/api/src/modules/hr/hr.controller.ts

Atualizar as assinaturas dos métodos para passar query params ao service.
Abrir o arquivo e fazer as seguintes alterações:

Adicionar `Query` ao import do `@nestjs/common`:
```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
```

Substituir os métodos `listEmployees`, `listPayroll`, `listLeaveRequests`:
```typescript
  @Get('employees')
  listEmployees(
    @CurrentTenant() tenant: { id: string },
    @Query('status') status?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.listEmployees(tenant.id, { status, offset, limit });
  }

  @Get('payroll')
  listPayroll(
    @CurrentTenant() tenant: { id: string },
    @Query('employee_id') employee_id?: string,
    @Query('competencia') competencia?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.listPayroll(tenant.id, { employee_id, competencia, offset, limit });
  }

  @Get('leave-requests')
  listLeaveRequests(
    @CurrentTenant() tenant: { id: string },
    @Query('employee_id') employee_id?: string,
    @Query('status') status?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.listLeaveRequests(tenant.id, { employee_id, status, offset, limit });
  }
```

---

## ETAPA 2 — ADICIONAR PAGINAÇÃO NOS 3 SERVIÇOS SEM ELA

### 2.1 — Substituir apps/api/src/modules/artist-goals/artist-goals.service.ts

Substituir apenas o método `list` — adicionar `count`, `offset`, `limit`, retornar `{ data, meta }`:

Encontrar o método `list` atual:
```typescript
  async list(tenantId: string) {
    return this.db
      .select()
      .from(artistGoals)
      .where(and(eq(artistGoals.tenant_id, tenantId), isNull(artistGoals.deleted_at)))
      .orderBy(desc(artistGoals.created_at));
  }
```

Substituir por:
```typescript
  async list(tenantId: string, query: { artista_id?: string; status?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(artistGoals.tenant_id, tenantId), isNull(artistGoals.deleted_at)];
    if (query.artista_id) conds.push(eq(artistGoals.artista_id, query.artista_id));
    if (query.status)     conds.push(eq(artistGoals.status, query.status));
    const where = and(...conds);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(artistGoals).where(where)
        .orderBy(desc(artistGoals.created_at))
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(artistGoals).where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }
```

Adicionar `count` ao import do drizzle-orm no topo do arquivo:
```typescript
import { eq, and, isNull, desc, count } from 'drizzle-orm';
```

Atualizar também o método `list` no controller correspondente
(apps/api/src/modules/artist-goals/artist-goals.controller.ts).
Adicionar `Query` ao import e query params:
```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
```

Substituir o método `list`:
```typescript
  @Get()
  list(
    @CurrentTenant() tenant: { id: string },
    @Query('artista_id') artista_id?: string,
    @Query('status') status?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.list(tenant.id, { artista_id, status, offset, limit });
  }
```

### 2.2 — Substituir método list em apps/api/src/modules/content-detections/content-detections.service.ts

Encontrar o método `list` atual:
```typescript
  async list(tenantId: string) {
    return this.db
      .select()
      .from(contentDetections)
      .where(and(eq(contentDetections.tenant_id, tenantId), isNull(contentDetections.deleted_at)))
      .orderBy(desc(contentDetections.created_at));
  }
```

Substituir por:
```typescript
  async list(tenantId: string, query: { status?: string; plataforma?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(contentDetections.tenant_id, tenantId), isNull(contentDetections.deleted_at)];
    if (query.status)     conds.push(eq(contentDetections.status, query.status));
    if (query.plataforma) conds.push(eq(contentDetections.plataforma, query.plataforma));
    const where = and(...conds);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(contentDetections).where(where)
        .orderBy(desc(contentDetections.created_at))
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(contentDetections).where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }
```

Adicionar `count` ao import no topo:
```typescript
import { eq, and, isNull, desc, count } from 'drizzle-orm';
```

Atualizar o controller (apps/api/src/modules/content-detections/content-detections.controller.ts):
Adicionar `Query` ao import e atualizar o método `list`:
```typescript
  @Get()
  list(
    @CurrentTenant() tenant: { id: string },
    @Query('status') status?: string,
    @Query('plataforma') plataforma?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.list(tenant.id, { status, plataforma, offset, limit });
  }
```

### 2.3 — Substituir método list em apps/api/src/modules/ecad-reports/ecad-reports.service.ts

Encontrar o método `list` atual:
```typescript
  async list(tenantId: string) {
    return this.db
      .select()
      .from(ecadReports)
      .where(and(eq(ecadReports.tenant_id, tenantId), isNull(ecadReports.deleted_at)))
      .orderBy(desc(ecadReports.created_at));
  }
```

Substituir por:
```typescript
  async list(tenantId: string, query: { periodo?: string; status?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(ecadReports.tenant_id, tenantId), isNull(ecadReports.deleted_at)];
    if (query.periodo) conds.push(eq(ecadReports.periodo, query.periodo));
    if (query.status)  conds.push(eq(ecadReports.status, query.status));
    const where = and(...conds);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(ecadReports).where(where)
        .orderBy(desc(ecadReports.created_at))
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(ecadReports).where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }
```

Adicionar `count` ao import no topo:
```typescript
import { eq, and, isNull, desc, count } from 'drizzle-orm';
```

Atualizar o controller (apps/api/src/modules/ecad-reports/ecad-reports.controller.ts):
Adicionar `Query` ao import e atualizar `list`:
```typescript
  @Get()
  list(
    @CurrentTenant() tenant: { id: string },
    @Query('periodo') periodo?: string,
    @Query('status') status?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.list(tenant.id, { periodo, status, offset, limit });
  }
```

---

## ETAPA 3 — GERAR E APLICAR MIGRATION DAS 6 NOVAS TABELAS

As tabelas `artist_goals`, `content_detections`, `ecad_reports`,
`employees`, `payroll_entries`, `leave_requests` existem no schema.ts
mas **não existem no banco** — a migration nunca foi gerada.

### 3.1 — Gerar nova migration

```bash
cd apps/api
npx drizzle-kit generate
```

Verificar que um novo arquivo SQL foi criado em `apps/api/drizzle/`.
O arquivo deve conter 6 `CREATE TABLE` para as novas tabelas.

### 3.2 — Aplicar no banco Neon

```bash
npx drizzle-kit push
cd ../..
```

Se `drizzle-kit push` falhar por problema de conexão, tentar:
```bash
cd apps/api && npx drizzle-kit migrate && cd ../..
```

### 3.3 — Verificar resultado

```bash
cd apps/api
npx drizzle-kit studio &
sleep 3
curl -s http://localhost:4983/api/tables 2>/dev/null | grep -o '"name":"[^"]*"' | head -40
kill %1 2>/dev/null
cd ../..
```

---

## ETAPA 4 — LIMPAR PENDING_TABLES NO FRONTEND

### 4.1 — Atualizar client/src/shared/lib/api-client.ts

Abrir o arquivo. Localizar o bloco `TABLE_ENDPOINT` e adicionar as 4 entradas faltantes
logo antes do fechamento `}`:

```typescript
  // ── novos módulos ──────────────────────────────────────────────────────────
  metas_artistas:         '/artist-goals',
  relatorios_ecad:        '/ecad-reports',
  deteccoes:              '/content-detections',
  documentos_funcionario: '/hr/employees',
```

Em seguida, localizar o bloco `PENDING_TABLES` e substituir seu conteúdo inteiro por:

```typescript
export const PENDING_TABLES: Record<string, string> = {};
```

Verificar que não sobrou nenhuma entrada em `PENDING_TABLES`.

---

## ETAPA 5 — ADICIONAR FEATUREGATE NA PÁGINA AGENDA

### 5.1 — Atualizar client/src/modules/events/pages/Agenda.tsx

Abrir o arquivo. Adicionar o import no topo (após os imports existentes):

```typescript
import { FeatureGate } from '@/shared/components/FeatureGate';
```

Localizar o `return (` do componente principal (a função `Agenda` ou similar).
Envolver o conteúdo retornado com `FeatureGate`:

```tsx
// Antes:
return (
  <MainLayout ...>
    ...
  </MainLayout>
);

// Depois:
return (
  <FeatureGate feature="moduleEvents" featureName="Agenda & Eventos">
    <MainLayout ...>
      ...
    </MainLayout>
  </FeatureGate>
);
```

---

## ETAPA 6 — IMPLEMENTAR YOUTUBE E DEEZER

### 6.1 — Criar apps/api/src/modules/integrations/youtube/youtube.service.ts

```typescript
/**
 * integrations/youtube/youtube.service.ts
 *
 * YouTube Data API v3 — estatísticas de canal e busca de vídeos.
 * Requer YOUTUBE_API_KEY no env (Data API key, não OAuth).
 * Endpoints públicos — não requer autenticação do usuário.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);
  private readonly apiKey: string | undefined;
  private readonly BASE = 'https://www.googleapis.com/youtube/v3';

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('YOUTUBE_API_KEY');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async getChannelStats(channelId: string) {
    if (!this.apiKey) {
      return { configured: false, error: 'YOUTUBE_API_KEY não configurada', channelId };
    }

    const url = `${this.BASE}/channels?part=statistics,snippet&id=${encodeURIComponent(channelId)}&key=${this.apiKey}`;

    try {
      const res  = await fetch(url);
      const data = await res.json() as any;

      if (!res.ok) {
        this.logger.warn(`YouTube API error: ${data?.error?.message}`);
        return { error: data?.error?.message ?? 'Erro na API YouTube', channelId };
      }

      const ch = data.items?.[0];
      if (!ch) return { error: 'Canal não encontrado', channelId };

      return {
        channelId,
        title:         ch.snippet?.title        ?? '',
        description:   ch.snippet?.description  ?? '',
        subscribers:   Number(ch.statistics?.subscriberCount  ?? 0),
        totalViews:    Number(ch.statistics?.viewCount         ?? 0),
        videoCount:    Number(ch.statistics?.videoCount        ?? 0),
        thumbnailUrl:  ch.snippet?.thumbnails?.medium?.url     ?? '',
        customUrl:     ch.snippet?.customUrl    ?? '',
        publishedAt:   ch.snippet?.publishedAt  ?? '',
        syncedAt:      new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error('YouTube getChannelStats error', err);
      throw err;
    }
  }

  async searchVideos(query: string, maxResults = 10) {
    if (!this.apiKey) return [];

    const url = `${this.BASE}/search`
      + `?part=snippet`
      + `&q=${encodeURIComponent(query)}`
      + `&type=video`
      + `&maxResults=${maxResults}`
      + `&key=${this.apiKey}`;

    try {
      const res  = await fetch(url);
      const data = await res.json() as any;

      if (!res.ok) {
        this.logger.warn(`YouTube search error: ${data?.error?.message}`);
        return [];
      }

      return (data.items ?? []).map((item: any) => ({
        videoId:      item.id?.videoId,
        title:        item.snippet?.title,
        description:  item.snippet?.description,
        channelId:    item.snippet?.channelId,
        channelName:  item.snippet?.channelTitle,
        publishedAt:  item.snippet?.publishedAt,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
      }));
    } catch (err) {
      this.logger.error('YouTube searchVideos error', err);
      return [];
    }
  }

  async getVideoStats(videoId: string) {
    if (!this.apiKey) return { configured: false, error: 'YOUTUBE_API_KEY não configurada' };

    const url = `${this.BASE}/videos?part=statistics,snippet&id=${encodeURIComponent(videoId)}&key=${this.apiKey}`;

    try {
      const res  = await fetch(url);
      const data = await res.json() as any;
      const v    = data.items?.[0];
      if (!v) return { error: 'Vídeo não encontrado', videoId };

      return {
        videoId,
        title:     v.snippet?.title,
        views:     Number(v.statistics?.viewCount    ?? 0),
        likes:     Number(v.statistics?.likeCount    ?? 0),
        comments:  Number(v.statistics?.commentCount ?? 0),
        syncedAt:  new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error('YouTube getVideoStats error', err);
      throw err;
    }
  }
}
```

### 6.2 — Criar apps/api/src/modules/integrations/deezer/deezer.service.ts

```typescript
/**
 * integrations/deezer/deezer.service.ts
 *
 * Deezer Public API — sem autenticação para dados públicos.
 * Docs: https://developers.deezer.com/api
 */

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeezerService {
  private readonly logger = new Logger(DeezerService.name);
  private readonly BASE = 'https://api.deezer.com';

  isConfigured(): boolean { return true; }

  async getArtistStats(artistId: string) {
    try {
      const res  = await fetch(`${this.BASE}/artist/${encodeURIComponent(artistId)}`);
      const data = await res.json() as any;

      if (data.error) {
        return { error: data.error.message, artistId };
      }

      return {
        artistId:     String(data.id),
        name:         data.name,
        fans:         data.nb_fan     ?? 0,
        albumCount:   data.nb_album   ?? 0,
        tracklist:    data.tracklist  ?? '',
        link:         data.link       ?? '',
        pictureUrl:   data.picture_medium ?? '',
        pictureXl:    data.picture_xl ?? '',
        syncedAt:     new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`Deezer getArtistStats error for ${artistId}`, err);
      throw err;
    }
  }

  async searchArtist(query: string, limit = 5) {
    try {
      const res  = await fetch(`${this.BASE}/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
      const data = await res.json() as any;

      return (data.data ?? []).map((a: any) => ({
        id:         String(a.id),
        name:       a.name,
        fans:       a.nb_fan   ?? 0,
        pictureUrl: a.picture_medium ?? '',
        link:       a.link    ?? '',
      }));
    } catch (err) {
      this.logger.error('Deezer searchArtist error', err);
      return [];
    }
  }

  async getTopTracks(artistId: string, limit = 10) {
    try {
      const res  = await fetch(`${this.BASE}/artist/${encodeURIComponent(artistId)}/top?limit=${limit}`);
      const data = await res.json() as any;

      return (data.data ?? []).map((t: any) => ({
        id:         String(t.id),
        title:      t.title,
        duration:   t.duration,
        rank:       t.rank    ?? 0,
        preview:    t.preview ?? '',
        link:       t.link    ?? '',
        album: {
          id:       String(t.album?.id ?? ''),
          title:    t.album?.title ?? '',
          coverUrl: t.album?.cover_medium ?? '',
        },
      }));
    } catch (err) {
      this.logger.error(`Deezer getTopTracks error for ${artistId}`, err);
      return [];
    }
  }

  async getAlbum(albumId: string) {
    try {
      const res  = await fetch(`${this.BASE}/album/${encodeURIComponent(albumId)}`);
      const data = await res.json() as any;
      if (data.error) return { error: data.error.message, albumId };

      return {
        albumId:    String(data.id),
        title:      data.title,
        artistName: data.artist?.name ?? '',
        fans:       data.fans         ?? 0,
        tracks:     data.nb_tracks    ?? 0,
        releaseDate:data.release_date ?? '',
        coverUrl:   data.cover_medium ?? '',
        link:       data.link         ?? '',
        syncedAt:   new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`Deezer getAlbum error for ${albumId}`, err);
      throw err;
    }
  }
}
```

### 6.3 — Atualizar apps/api/src/modules/integrations/integrations.module.ts

Abrir o arquivo. Adicionar os imports no topo:
```typescript
import { YouTubeService } from './youtube/youtube.service';
import { DeezerService }  from './deezer/deezer.service';
```

Localizar o array `providers:` e adicionar os dois serviços:
```typescript
providers: [ACRCloudService, AutentiqueService, SpotifyService, YouTubeService, DeezerService],
```

Localizar o array `exports:` e adicionar também:
```typescript
exports: [ACRCloudService, AutentiqueService, SpotifyService, YouTubeService, DeezerService],
```

### 6.4 — Atualizar apps/api/src/modules/integrations/integrations.controller.ts

Abrir o arquivo. Adicionar os imports:
```typescript
import { YouTubeService } from './youtube/youtube.service';
import { DeezerService }  from './deezer/deezer.service';
```

Adicionar ao `constructor` (manter os existentes):
```typescript
  constructor(
    // ... serviços existentes ...
    private readonly youtube: YouTubeService,
    private readonly deezer:  DeezerService,
  ) {}
```

Adicionar ao final da classe, antes do último `}`:

```typescript
  // ─── YouTube ───────────────────────────────────────────────────────────────

  @Get('youtube/status')
  youtubeStatus() {
    return { configured: this.youtube.isConfigured() };
  }

  @Get('youtube/channel/:channelId')
  getYouTubeChannel(@Param('channelId') channelId: string) {
    return this.youtube.getChannelStats(channelId);
  }

  @Get('youtube/video/:videoId')
  getYouTubeVideo(@Param('videoId') videoId: string) {
    return this.youtube.getVideoStats(videoId);
  }

  @Get('youtube/search')
  searchYouTube(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.youtube.searchVideos(q, limit ? Number(limit) : 10);
  }

  // ─── Deezer ────────────────────────────────────────────────────────────────

  @Get('deezer/artist/:artistId')
  getDeezerArtist(@Param('artistId') artistId: string) {
    return this.deezer.getArtistStats(artistId);
  }

  @Get('deezer/artist/:artistId/top')
  getDeezerTopTracks(
    @Param('artistId') artistId: string,
    @Query('limit') limit?: string,
  ) {
    return this.deezer.getTopTracks(artistId, limit ? Number(limit) : 10);
  }

  @Get('deezer/album/:albumId')
  getDeezerAlbum(@Param('albumId') albumId: string) {
    return this.deezer.getAlbum(albumId);
  }

  @Get('deezer/search')
  searchDeezer(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.deezer.searchArtist(q, limit ? Number(limit) : 5);
  }
```

Verificar se o controller já tem `@Query` e `@Param` no import do `@nestjs/common`.
Se não tiver, adicionar:
```typescript
import {
  Controller, Get, Post, Param, Query, Body, UseGuards,
} from '@nestjs/common';
```

### 6.5 — Adicionar YOUTUBE_API_KEY ao env.schema.ts

Abrir apps/api/src/core/config/env.schema.ts.
Localizar onde estão as outras variáveis opcionais (como `STRIPE_SECRET_KEY`)
e adicionar:
```typescript
YOUTUBE_API_KEY: z.string().optional(),
```

---

## ETAPA 7 — VERIFICAR TYPECHECK DA API

```bash
cd apps/api
npx tsc --noEmit 2>&1
cd ../..
```

Se houver erros de TypeScript, corrigi-los antes de continuar.

Erros mais prováveis e correções:
- `count is not exported` → verificar import: `import { eq, and, isNull, desc, count } from 'drizzle-orm';`
- `Property 'email' does not exist on type 'CreateEmployeeDto'` → verificar que o DTO foi atualizado na etapa 1
- `YouTubeService is not a provider` → verificar que foi adicionado em providers do integrations.module.ts
- `Cannot find module './youtube/youtube.service'` → verificar que o arquivo existe no caminho correto

---

## ETAPA 8 — EXECUTAR TESTES COM COBERTURA REAL

```bash
cd apps/api
npm run test:coverage 2>&1
cd ../..
```

Output esperado:
- Todos os 8 spec files devem passar
- Cobertura global deve aparecer na tabela (não apenas 3 arquivos)
- O threshold global de 55% em statements deve ser atingido

Se um spec falhar, verificar o erro e corrigir o mock correspondente.
Erros comuns:
- `Cannot find module 'stripe'` no billing spec → o mock deve estar no topo com `jest.mock('stripe', ...)`
- `EncryptionService not found` no HrService spec → adicionar mock de EncryptionService nos testes

---

## ETAPA 9 — CRIAR .env NA RAIZ

Verificar se o arquivo `.env` existe na raiz. Se não existir, criá-lo:

```bash
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3001/api/v1
VITE_USE_MOCK=false
VITE_MOCK_MODE=false
VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY:-pk_test_placeholder}
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
EOF
```

Se o Replit tem o valor de `VITE_CLERK_PUBLISHABLE_KEY` nos Secrets, usar o valor real:
```bash
if [ -n "$VITE_CLERK_PUBLISHABLE_KEY" ]; then
  sed -i "s/pk_test_placeholder/$VITE_CLERK_PUBLISHABLE_KEY/" .env
fi
```

---

## ETAPA 10 — BUILD FINAL PARA CONFIRMAR ZERO ERROS

```bash
cd apps/api && npm run build 2>&1 | tail -20
cd ../..
npm run build 2>&1 | tail -20
```

Ambos devem completar sem erros.

Se o build da API falhar com erro relacionado ao `EncryptionService` no `HrModule`:
O `EncryptionService` é provido pelo `CoreModule` que é `@Global()`, portanto
está disponível para injeção sem precisar importar o `CoreModule` no `HrModule`.
Se mesmo assim o erro persistir, adicionar ao `HrModule`:
```typescript
import { CoreModule } from '../../core/core.module';

@Module({
  imports:     [CoreModule],   // ← adicionar esta linha
  controllers: [HrController],
  providers:   [HrService],
  exports:     [HrService],
})
export class HrModule {}
```

---

## VERIFICAÇÃO FINAL

Executar os seguintes comandos e verificar os outputs:

```bash
echo "=== 1. Migration gerada? ==="
ls apps/api/drizzle/*.sql

echo "=== 2. PENDING_TABLES vazio? ==="
grep -A 3 "PENDING_TABLES" client/src/shared/lib/api-client.ts | head -4

echo "=== 3. TABLE_ENDPOINT tem novas rotas? ==="
grep -E "metas_artistas|relatorios_ecad|deteccoes|documentos_func" client/src/shared/lib/api-client.ts

echo "=== 4. EncryptionService injetado no HrService? ==="
grep "EncryptionService\|enc\." apps/api/src/modules/hr/hr.service.ts | head -5

echo "=== 5. YouTube e Deezer existem? ==="
ls apps/api/src/modules/integrations/youtube/youtube.service.ts 2>&1
ls apps/api/src/modules/integrations/deezer/deezer.service.ts 2>&1

echo "=== 6. Paginação no artist-goals? ==="
grep -c "count\|meta\|total" apps/api/src/modules/artist-goals/artist-goals.service.ts

echo "=== 7. FeatureGate na Agenda? ==="
grep "FeatureGate" client/src/modules/events/pages/Agenda.tsx | head -2

echo "=== 8. TypeScript errors? ==="
cd apps/api && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
cd ../..
```

Resultados esperados:
1. 2+ arquivos .sql (0000 + 0001 ou similar)
2. `PENDING_TABLES: Record<string, string> = {};`
3. 4 novas rotas encontradas no TABLE_ENDPOINT
4. `EncryptionService` e `enc.` aparecem no HrService
5. Ambos os arquivos existem
6. Número > 0 (count, meta, total presentes)
7. `FeatureGate` encontrado
8. `0` erros de TypeScript
```
