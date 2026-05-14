# MUSIC OS 360° — MASTER PROMPT AUTO-AUDITÁVEL

## COMO FUNCIONA

Este prompt é **idempotente**: pode ser executado a qualquer momento,
em qualquer estado do projeto. Cada etapa começa verificando se já
está completa. Se sim, pula. Se não, implementa.

Execute **tudo do início ao fim sem parar para perguntar**.
Se um passo falhar, corrija o erro e continue para o próximo.

---

## PRÉ-VERIFICAÇÃO — LER ESTADO ATUAL DO PROJETO

```bash
echo "=== ESTADO ATUAL ==="
echo "Spec files:" $(find apps/api/src -name "*.spec.ts" | wc -l)
echo "Migration files:" $(ls apps/api/drizzle/*.sql 2>/dev/null | wc -l)
echo "Schema tables:" $(grep -c "pgTable" apps/api/src/database/schema.ts 2>/dev/null)
echo "Integration services:" $(ls apps/api/src/modules/integrations/*/  2>/dev/null | grep "service.ts" | wc -l)
echo "PENDING_TABLES empty:" $(grep -c "pending:" client/src/shared/lib/api-client.ts 2>/dev/null)
echo "HR has encryption:" $(grep -c "EncryptionService" apps/api/src/modules/hr/hr.service.ts 2>/dev/null)
echo "Agenda has FeatureGate:" $(grep -c "FeatureGate" client/src/modules/events/pages/Agenda.tsx 2>/dev/null)
```

---

## PASSO 1 — CORRIGIR HR SERVICE (criptografia server-side)

**VERIFICAR:**
```bash
grep -q "EncryptionService" apps/api/src/modules/hr/hr.service.ts && \
grep -q "encryptNullable" apps/api/src/modules/hr/hr.service.ts && \
echo "PASS" || echo "FAIL"
```

**Se FAIL — executar:**

Substituir `apps/api/src/modules/hr/dto/create-employee.dto.ts`:

```typescript
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() nome: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() tipo_contrato?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() salario?: string;
  @IsOptional() @IsDateString() data_admissao?: string;
  @IsOptional() @IsDateString() data_demissao?: string;
  @IsOptional() documentos?: unknown[];
  @IsOptional() metadata?: Record<string, unknown>;
}
```

Substituir `apps/api/src/modules/hr/dto/update-employee.dto.ts`:

```typescript
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() tipo_contrato?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() salario?: string;
  @IsOptional() @IsDateString() data_admissao?: string;
  @IsOptional() @IsDateString() data_demissao?: string;
  @IsOptional() documentos?: unknown[];
  @IsOptional() metadata?: Record<string, unknown>;
}
```

Substituir `apps/api/src/modules/hr/hr.service.ts` completamente:

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, count }          from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }                 from '../../database/database.module';
import { EncryptionService }                     from '../../core/security/encryption.service';
import { employees, Employee, payrollEntries, PayrollEntry, leaveRequests, LeaveRequest } from '../../database/schema';
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

  private mapEmployee(e: Employee) {
    return {
      ...e,
      email:    this.enc.decryptNullable(e.email_encrypted),
      telefone: this.enc.decryptNullable(e.telefone_encrypted),
      cpf:      this.enc.decryptNullable(e.cpf_encrypted),
      email_encrypted: undefined,
      telefone_encrypted: undefined,
      cpf_encrypted: undefined,
    };
  }

  async listEmployees(tenantId: string, query: { status?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(employees.tenant_id, tenantId), isNull(employees.deleted_at)];
    if (query.status) conds.push(eq(employees.status, query.status));
    const where = and(...conds);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(employees).where(where).orderBy(desc(employees.created_at)).offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(employees).where(where),
    ]);
    return { data: rows.map(e => this.mapEmployee(e)), meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findEmployee(tenantId: string, id: string) {
    const [r] = await this.db.select().from(employees)
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id), isNull(employees.deleted_at))).limit(1);
    if (!r) throw new NotFoundException('Funcionário não encontrado');
    return this.mapEmployee(r);
  }

  async createEmployee(tenantId: string, userId: string, dto: CreateEmployeeDto) {
    const [r] = await this.db.insert(employees).values({
      tenant_id: tenantId, nome: dto.nome, cargo: dto.cargo ?? null,
      departamento: dto.departamento ?? null, tipo_contrato: dto.tipo_contrato ?? 'clt',
      status: dto.status ?? 'ativo',
      email_encrypted:    this.enc.encryptNullable(dto.email),
      telefone_encrypted: this.enc.encryptNullable(dto.telefone),
      cpf_encrypted:      this.enc.encryptNullable(dto.cpf),
      salario: dto.salario ?? null,
      data_admissao: dto.data_admissao ? new Date(dto.data_admissao) : null,
      data_demissao: dto.data_demissao ? new Date(dto.data_demissao) : null,
      documentos: dto.documentos ?? [], metadata: dto.metadata ?? {}, created_by: userId,
    }).returning();
    return this.mapEmployee(r);
  }

  async updateEmployee(tenantId: string, userId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findEmployee(tenantId, id);
    const [r] = await this.db.update(employees).set({
      ...(dto.nome          != null && { nome:          dto.nome }),
      ...(dto.cargo         != null && { cargo:         dto.cargo }),
      ...(dto.departamento  != null && { departamento:  dto.departamento }),
      ...(dto.tipo_contrato != null && { tipo_contrato: dto.tipo_contrato }),
      ...(dto.status        != null && { status:        dto.status }),
      ...(dto.salario       != null && { salario:       dto.salario }),
      ...(dto.email    !== undefined && { email_encrypted:    this.enc.encryptNullable(dto.email) }),
      ...(dto.telefone !== undefined && { telefone_encrypted: this.enc.encryptNullable(dto.telefone) }),
      ...(dto.cpf      !== undefined && { cpf_encrypted:      this.enc.encryptNullable(dto.cpf) }),
      updated_at: new Date(),
    }).where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id), isNull(employees.deleted_at))).returning();
    return this.mapEmployee(r);
  }

  async softDeleteEmployee(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findEmployee(tenantId, id);
    await this.db.update(employees).set({ deleted_at: new Date() })
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id)));
    return { deleted: true };
  }

  async listPayroll(tenantId: string, query: { employee_id?: string; competencia?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(payrollEntries.tenant_id, tenantId), isNull(payrollEntries.deleted_at)];
    if (query.employee_id) conds.push(eq(payrollEntries.employee_id, query.employee_id));
    if (query.competencia) conds.push(eq(payrollEntries.competencia, query.competencia));
    const where = and(...conds);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(payrollEntries).where(where).orderBy(desc(payrollEntries.created_at)).offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(payrollEntries).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async createPayroll(tenantId: string, dto: CreatePayrollEntryDto): Promise<PayrollEntry> {
    const [r] = await this.db.insert(payrollEntries).values({
      tenant_id: tenantId, employee_id: dto.employee_id, competencia: dto.competencia,
      salario_bruto: dto.salario_bruto, descontos: dto.descontos ?? '0',
      salario_liquido: dto.salario_liquido, status: dto.status ?? 'pendente',
      arquivo_url: dto.arquivo_url ?? null, metadata: dto.metadata ?? {},
    }).returning();
    return r;
  }

  async listLeaveRequests(tenantId: string, query: { employee_id?: string; status?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(leaveRequests.tenant_id, tenantId), isNull(leaveRequests.deleted_at)];
    if (query.employee_id) conds.push(eq(leaveRequests.employee_id, query.employee_id));
    if (query.status)      conds.push(eq(leaveRequests.status, query.status));
    const where = and(...conds);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(leaveRequests).where(where).orderBy(desc(leaveRequests.created_at)).offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(leaveRequests).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async createLeaveRequest(tenantId: string, userId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const [r] = await this.db.insert(leaveRequests).values({
      tenant_id: tenantId, employee_id: dto.employee_id, tipo: dto.tipo,
      data_inicio: new Date(dto.data_inicio), data_fim: new Date(dto.data_fim),
      status: dto.status ?? 'pendente', motivo: dto.motivo ?? null,
      aprovado_por: dto.aprovado_por ?? null, created_by: userId,
    }).returning();
    return r;
  }

  async approveLeaveRequest(tenantId: string, id: string, userId: string): Promise<LeaveRequest> {
    const [r] = await this.db.update(leaveRequests)
      .set({ status: 'aprovado', aprovado_por: userId, updated_at: new Date() })
      .where(and(eq(leaveRequests.tenant_id, tenantId), eq(leaveRequests.id, id), isNull(leaveRequests.deleted_at))).returning();
    if (!r) throw new NotFoundException('Afastamento não encontrado');
    return r;
  }
}
```

---

## PASSO 2 — PAGINAÇÃO NOS 3 NOVOS SERVIÇOS

**VERIFICAR:**
```bash
grep -q "meta:" apps/api/src/modules/artist-goals/artist-goals.service.ts && \
grep -q "meta:" apps/api/src/modules/content-detections/content-detections.service.ts && \
grep -q "meta:" apps/api/src/modules/ecad-reports/ecad-reports.service.ts && \
echo "PASS" || echo "FAIL"
```

**Se FAIL — no método `list` de cada arquivo, substituir:**

Em `artist-goals.service.ts` — trocar import e método `list`:
```typescript
// Adicionar count ao import:
import { eq, and, isNull, desc, count } from 'drizzle-orm';

// Substituir método list:
async list(tenantId: string, query: { artista_id?: string; status?: string; offset?: number; limit?: number } = {}) {
  const conds = [eq(artistGoals.tenant_id, tenantId), isNull(artistGoals.deleted_at)];
  if (query.artista_id) conds.push(eq(artistGoals.artista_id, query.artista_id));
  if (query.status)     conds.push(eq(artistGoals.status, query.status));
  const where = and(...conds);
  const [rows, [{ value: total }]] = await Promise.all([
    this.db.select().from(artistGoals).where(where).orderBy(desc(artistGoals.created_at)).offset(query.offset ?? 0).limit(query.limit ?? 50),
    this.db.select({ value: count() }).from(artistGoals).where(where),
  ]);
  return { data: rows, meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
}
```

Em `content-detections.service.ts` — trocar import e método `list`:
```typescript
import { eq, and, isNull, desc, count } from 'drizzle-orm';

async list(tenantId: string, query: { status?: string; plataforma?: string; offset?: number; limit?: number } = {}) {
  const conds = [eq(contentDetections.tenant_id, tenantId), isNull(contentDetections.deleted_at)];
  if (query.status)     conds.push(eq(contentDetections.status, query.status));
  if (query.plataforma) conds.push(eq(contentDetections.plataforma, query.plataforma));
  const where = and(...conds);
  const [rows, [{ value: total }]] = await Promise.all([
    this.db.select().from(contentDetections).where(where).orderBy(desc(contentDetections.created_at)).offset(query.offset ?? 0).limit(query.limit ?? 50),
    this.db.select({ value: count() }).from(contentDetections).where(where),
  ]);
  return { data: rows, meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
}
```

Em `ecad-reports.service.ts` — trocar import e método `list`:
```typescript
import { eq, and, isNull, desc, count } from 'drizzle-orm';

async list(tenantId: string, query: { periodo?: string; status?: string; offset?: number; limit?: number } = {}) {
  const conds = [eq(ecadReports.tenant_id, tenantId), isNull(ecadReports.deleted_at)];
  if (query.periodo) conds.push(eq(ecadReports.periodo, query.periodo));
  if (query.status)  conds.push(eq(ecadReports.status, query.status));
  const where = and(...conds);
  const [rows, [{ value: total }]] = await Promise.all([
    this.db.select().from(ecadReports).where(where).orderBy(desc(ecadReports.created_at)).offset(query.offset ?? 0).limit(query.limit ?? 50),
    this.db.select({ value: count() }).from(ecadReports).where(where),
  ]);
  return { data: rows, meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 } };
}
```

---

## PASSO 3 — PENDING_TABLES VAZIO

**VERIFICAR:**
```bash
python3 -c "
import re, sys
content = open('client/src/shared/lib/api-client.ts').read()
m = re.search(r'PENDING_TABLES.*?=\s*\{([^}]*)\}', content, re.DOTALL)
entries = [l.strip() for l in m.group(1).split('\n') if l.strip() and not l.strip().startswith('//')]
print('PASS' if not entries else f'FAIL: {len(entries)} entries')
" 2>/dev/null || echo "FAIL"
```

**Se FAIL — em `client/src/shared/lib/api-client.ts`:**

1. Adicionar no bloco `TABLE_ENDPOINT` (antes do fechamento `}`):
```typescript
  metas_artistas:         '/artist-goals',
  relatorios_ecad:        '/ecad-reports',
  deteccoes:              '/content-detections',
  documentos_funcionario: '/hr/employees',
```

2. Substituir o bloco `PENDING_TABLES` por:
```typescript
export const PENDING_TABLES: Record<string, string> = {};
```

---

## PASSO 4 — FEATUREGATE NA AGENDA

**VERIFICAR:**
```bash
grep -q "FeatureGate" client/src/modules/events/pages/Agenda.tsx && echo "PASS" || echo "FAIL"
```

**Se FAIL:**

Abrir `client/src/modules/events/pages/Agenda.tsx`.

Adicionar import no topo (após os outros imports):
```typescript
import { FeatureGate } from '@/shared/components/FeatureGate';
```

Envolver o `return (` da função principal:
```tsx
return (
  <FeatureGate feature="moduleEvents" featureName="Agenda & Eventos">
    {/* todo o conteúdo atual do return fica aqui dentro */}
  </FeatureGate>
);
```

---

## PASSO 5 — MIGRATION DAS 6 NOVAS TABELAS

**VERIFICAR:**
```bash
ls apps/api/drizzle/*.sql 2>/dev/null | wc -l | xargs -I{} bash -c '[ {} -ge 2 ] && echo "PASS" || echo "FAIL"'
```

**Se FAIL (apenas 1 migration):**
```bash
cd apps/api
npx drizzle-kit generate
npx drizzle-kit push 2>&1 || npx drizzle-kit migrate 2>&1
cd ../..
```

---

## PASSO 6 — SERVIÇO BASE DE INTEGRAÇÃO

**VERIFICAR:**
```bash
[ -f "apps/api/src/modules/integrations/integration-base.service.ts" ] && echo "PASS" || echo "FAIL"
```

**Se FAIL — criar `apps/api/src/modules/integrations/integration-base.service.ts`:**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { eq, and }            from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { EncryptionService }  from '../../core/security/encryption.service';
import { integrations, oauthConnections, OAuthConnection } from '../../database/schema';

@Injectable()
export class IntegrationBaseService {
  constructor(
    @Inject(DRIZZLE_DB) protected readonly db: DrizzleDB,
    protected readonly enc: EncryptionService,
  ) {}

  protected async saveCredentials(tenantId: string, provider: string, creds: object): Promise<void> {
    const encrypted = this.enc.encrypt(JSON.stringify(creds));
    const [existing] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider))).limit(1);
    if (existing) {
      await this.db.update(integrations).set({ credentials_encrypted: encrypted, status: 'connected', updated_at: new Date() }).where(eq(integrations.id, existing.id));
    } else {
      await this.db.insert(integrations).values({ tenant_id: tenantId, provider, status: 'connected', credentials_encrypted: encrypted });
    }
  }

  protected async loadCredentials<T>(tenantId: string, provider: string): Promise<T | null> {
    const [row] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider))).limit(1);
    if (!row?.credentials_encrypted) return null;
    return JSON.parse(this.enc.decrypt(row.credentials_encrypted)) as T;
  }

  protected async getProviderStatus(tenantId: string, provider: string) {
    const [row] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider))).limit(1);
    return { connected: !!row?.credentials_encrypted, status: row?.status ?? 'disconnected', last_sync_at: row?.last_sync_at ?? null };
  }

  protected async removeCredentials(tenantId: string, provider: string): Promise<void> {
    await this.db.update(integrations).set({ credentials_encrypted: null, status: 'disconnected', updated_at: new Date() })
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)));
  }

  protected async saveOAuthTokens(p: { tenantId: string; userId: string; provider: string; accessToken: string; refreshToken?: string | null; expiresIn?: number; scopes?: string }): Promise<void> {
    const expiresAt = p.expiresIn ? new Date(Date.now() + p.expiresIn * 1000) : null;
    const [existing] = await this.db.select().from(oauthConnections)
      .where(and(eq(oauthConnections.tenant_id, p.tenantId), eq(oauthConnections.user_id, p.userId), eq(oauthConnections.provider, p.provider))).limit(1);
    if (existing) {
      await this.db.update(oauthConnections).set({
        access_token_encrypted:  this.enc.encrypt(p.accessToken),
        refresh_token_encrypted: p.refreshToken ? this.enc.encrypt(p.refreshToken) : existing.refresh_token_encrypted,
        expires_at: expiresAt, scopes: p.scopes ?? existing.scopes, updated_at: new Date(),
      }).where(eq(oauthConnections.id, existing.id));
    } else {
      await this.db.insert(oauthConnections).values({
        tenant_id: p.tenantId, user_id: p.userId, provider: p.provider,
        access_token_encrypted: this.enc.encrypt(p.accessToken),
        refresh_token_encrypted: p.refreshToken ? this.enc.encrypt(p.refreshToken) : null,
        expires_at: expiresAt, scopes: p.scopes ?? null,
      });
    }
    await this.saveCredentials(p.tenantId, p.provider, { oauth: true });
  }

  protected async getOAuthConnection(tenantId: string, userId: string, provider: string): Promise<OAuthConnection | null> {
    const [conn] = await this.db.select().from(oauthConnections)
      .where(and(eq(oauthConnections.tenant_id, tenantId), eq(oauthConnections.user_id, userId), eq(oauthConnections.provider, provider))).limit(1);
    return conn ?? null;
  }

  protected async removeOAuth(tenantId: string, userId: string, provider: string): Promise<void> {
    await this.db.delete(oauthConnections).where(and(
      eq(oauthConnections.tenant_id, tenantId), eq(oauthConnections.user_id, userId), eq(oauthConnections.provider, provider),
    ));
    await this.removeCredentials(tenantId, provider);
  }
}
```

---

## PASSO 7 — SOUNDCLOUD SERVICE

**VERIFICAR:**
```bash
[ -f "apps/api/src/modules/integrations/soundcloud/soundcloud.service.ts" ] && echo "PASS" || echo "FAIL"
```

**Se FAIL — criar `apps/api/src/modules/integrations/soundcloud/soundcloud.service.ts`:**

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }  from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

@Injectable()
export class SoundCloudService extends IntegrationBaseService {
  private readonly logger = new Logger(SoundCloudService.name);
  private readonly BASE = 'https://api.soundcloud.com';

  constructor(
    @Inject(DRIZZLE_DB) db: DrizzleDB,
    enc: EncryptionService,
    private readonly config: ConfigService,
  ) { super(db, enc); }

  isConfigured() { return !!this.config.get('SOUNDCLOUD_CLIENT_ID'); }

  async configure(tenantId: string, creds: { client_id: string; client_secret: string; permalink?: string }) {
    await this.saveCredentials(tenantId, 'soundcloud', creds);
    return { ok: true };
  }

  async getStatus(tenantId: string) { return this.getProviderStatus(tenantId, 'soundcloud'); }
  async disconnect(tenantId: string) { return this.removeCredentials(tenantId, 'soundcloud'); }

  async resolveUser(permalink: string) {
    const clientId = this.config.get<string>('SOUNDCLOUD_CLIENT_ID') ?? '';
    if (!clientId) return { error: 'SOUNDCLOUD_CLIENT_ID não configurado' };
    const res  = await fetch(`${this.BASE}/resolve?url=https://soundcloud.com/${encodeURIComponent(permalink)}&client_id=${clientId}`);
    if (!res.ok) return { error: `SoundCloud error: ${res.status}` };
    const d = await res.json() as any;
    return { id: String(d.id), permalink: d.permalink, username: d.username, followers: d.followers_count ?? 0, trackCount: d.track_count ?? 0, avatarUrl: d.avatar_url ?? '', syncedAt: new Date().toISOString() };
  }

  async getTrackStats(trackId: string) {
    const clientId = this.config.get<string>('SOUNDCLOUD_CLIENT_ID') ?? '';
    if (!clientId) return { error: 'SOUNDCLOUD_CLIENT_ID não configurado' };
    const res  = await fetch(`${this.BASE}/tracks/${trackId}?client_id=${clientId}`);
    if (!res.ok) return { error: `SoundCloud error: ${res.status}` };
    const d = await res.json() as any;
    return { id: String(d.id), title: d.title, playCount: d.playback_count ?? 0, likeCount: d.likes_count ?? 0, repostCount: d.reposts_count ?? 0, duration: d.duration ?? 0, permalink: d.permalink_url ?? '', artworkUrl: d.artwork_url ?? '', syncedAt: new Date().toISOString() };
  }

  async searchTracks(query: string, limit = 10) {
    const clientId = this.config.get<string>('SOUNDCLOUD_CLIENT_ID') ?? '';
    if (!clientId) return [];
    const res  = await fetch(`${this.BASE}/tracks?q=${encodeURIComponent(query)}&limit=${limit}&client_id=${clientId}`);
    if (!res.ok) return [];
    const data = await res.json() as any[];
    return data.map((t: any) => ({ id: String(t.id), title: t.title, plays: t.playback_count ?? 0, user: t.user?.username ?? '' }));
  }
}
```

---

## PASSO 8 — APPLE MUSIC SERVICE

**VERIFICAR:**
```bash
[ -f "apps/api/src/modules/integrations/apple-music/apple-music.service.ts" ] && echo "PASS" || echo "FAIL"
```

**Se FAIL — criar `apps/api/src/modules/integrations/apple-music/apple-music.service.ts`:**

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }  from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

interface AppleCreds { team_id: string; key_id: string; private_key: string; artist_id?: string; }

@Injectable()
export class AppleMusicService extends IntegrationBaseService {
  private readonly logger = new Logger(AppleMusicService.name);
  private readonly BASE = 'https://api.music.apple.com/v1';

  constructor(@Inject(DRIZZLE_DB) db: DrizzleDB, enc: EncryptionService) { super(db, enc); }

  async configure(tenantId: string, creds: AppleCreds) { await this.saveCredentials(tenantId, 'apple-music', creds); return { ok: true }; }
  async getStatus(tenantId: string) { return this.getProviderStatus(tenantId, 'apple-music'); }
  async disconnect(tenantId: string) { return this.removeCredentials(tenantId, 'apple-music'); }

  private generateToken(creds: AppleCreds): string {
    const now = Math.floor(Date.now() / 1000);
    const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: creds.key_id })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: creds.team_id, iat: now, exp: now + 3600 })).toString('base64url');
    const sign = crypto.createSign('SHA256');
    sign.update(`${header}.${payload}`);
    return `${header}.${payload}.${sign.sign(creds.private_key, 'base64url')}`;
  }

  async getArtist(artistId: string, storefront = 'br', tenantId?: string) {
    if (!tenantId) return { error: 'tenantId obrigatório' };
    const creds = await this.loadCredentials<AppleCreds>(tenantId, 'apple-music');
    if (!creds) return { error: 'Apple Music não configurado' };
    const res = await fetch(`${this.BASE}/catalog/${storefront}/artists/${artistId}`, { headers: { Authorization: `Bearer ${this.generateToken(creds)}` } });
    if (!res.ok) return { error: `Apple Music API error: ${res.status}` };
    const d = await res.json() as any;
    const a = d.data?.[0];
    if (!a) return { error: 'Artista não encontrado' };
    return { artistId, name: a.attributes?.name ?? '', genreNames: a.attributes?.genreNames ?? [], url: a.attributes?.url ?? '', syncedAt: new Date().toISOString() };
  }

  async search(query: string, storefront = 'br', tenantId?: string) {
    if (!tenantId) return {};
    const creds = await this.loadCredentials<AppleCreds>(tenantId, 'apple-music');
    if (!creds) return {};
    const res = await fetch(`${this.BASE}/catalog/${storefront}/search?term=${encodeURIComponent(query)}&types=artists,songs&limit=10`, { headers: { Authorization: `Bearer ${this.generateToken(creds)}` } });
    if (!res.ok) return {};
    const d = await res.json() as any;
    return {
      artists: (d.results?.artists?.data ?? []).map((a: any) => ({ id: a.id, name: a.attributes?.name, url: a.attributes?.url })),
      songs:   (d.results?.songs?.data   ?? []).map((s: any) => ({ id: s.id, title: s.attributes?.name, artist: s.attributes?.artistName, isrc: s.attributes?.isrc })),
    };
  }
}
```

---

## PASSO 9 — INSTAGRAM SERVICE

**VERIFICAR:**
```bash
[ -f "apps/api/src/modules/integrations/instagram/instagram.service.ts" ] && echo "PASS" || echo "FAIL"
```

**Se FAIL — criar `apps/api/src/modules/integrations/instagram/instagram.service.ts`:**

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }  from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

const FB_API   = 'https://graph.facebook.com/v19.0';
const FB_OAUTH = 'https://www.facebook.com/v19.0/dialog/oauth';
const FB_TOKEN = 'https://graph.facebook.com/v19.0/oauth/access_token';
const SCOPES   = 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement';

@Injectable()
export class InstagramService extends IntegrationBaseService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(@Inject(DRIZZLE_DB) db: DrizzleDB, enc: EncryptionService, private readonly config: ConfigService) { super(db, enc); }

  getAuthUrl(tenantId: string, userId: string): string {
    const appId = this.config.get<string>('META_APP_ID') ?? '';
    const redirect = this.config.get<string>('META_REDIRECT_URI') ?? '';
    const state = Buffer.from(JSON.stringify({ tenantId, userId, provider: 'instagram' })).toString('base64');
    return `${FB_OAUTH}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&scope=${SCOPES}&state=${encodeURIComponent(state)}&response_type=code`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const { tenantId, userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const appId = this.config.get<string>('META_APP_ID') ?? '';
    const appSecret = this.config.get<string>('META_APP_SECRET') ?? '';
    const redirect = this.config.get<string>('META_REDIRECT_URI') ?? '';
    const tokenRes = await fetch(`${FB_TOKEN}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&client_secret=${appSecret}&code=${code}`);
    const tokens = await tokenRes.json() as any;
    const llRes  = await fetch(`${FB_TOKEN}?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokens.access_token}`);
    const llData = await llRes.json() as any;
    await this.saveOAuthTokens({ tenantId, userId, provider: 'instagram', accessToken: llData.access_token ?? tokens.access_token, expiresIn: llData.expires_in, scopes: SCOPES });
    this.logger.log(`Instagram OAuth: ${userId}@${tenantId} conectado`);
  }

  async getStatus(tenantId: string) { return this.getProviderStatus(tenantId, 'instagram'); }
  async disconnectProvider(tenantId: string, userId: string) { return this.removeOAuth(tenantId, userId, 'instagram'); }

  async getAccountMetrics(tenantId: string, userId: string) {
    const conn = await this.getOAuthConnection(tenantId, userId, 'instagram');
    if (!conn) return { error: 'Instagram não conectado' };
    const token = this.enc.decrypt(conn.access_token_encrypted);
    const pagesRes = await fetch(`${FB_API}/me/accounts?access_token=${token}`);
    const pages = await pagesRes.json() as any;
    const page = pages.data?.[0];
    if (!page) return { error: 'Nenhuma página do Facebook encontrada' };
    const igRes  = await fetch(`${FB_API}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    const igData = await igRes.json() as any;
    const igId = igData.instagram_business_account?.id;
    if (!igId) return { error: 'Conta Instagram Business não vinculada' };
    const profileRes = await fetch(`${FB_API}/${igId}?fields=name,username,followers_count,media_count&access_token=${page.access_token}`);
    const profile = await profileRes.json() as any;
    return { accountId: igId, username: profile.username, name: profile.name, followers: profile.followers_count ?? 0, mediaCount: profile.media_count ?? 0, syncedAt: new Date().toISOString() };
  }
}
```

---

## PASSO 10 — TIKTOK SERVICE

**VERIFICAR:**
```bash
[ -f "apps/api/src/modules/integrations/tiktok/tiktok.service.ts" ] && echo "PASS" || echo "FAIL"
```

**Se FAIL — criar `apps/api/src/modules/integrations/tiktok/tiktok.service.ts`:**

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }  from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

const TIKTOK_ADS = 'https://business-api.tiktok.com/open_api/v1.3';

interface TikTokAdsCreds { app_id: string; secret: string; advertiser_id?: string; }

@Injectable()
export class TikTokService extends IntegrationBaseService {
  private readonly logger = new Logger(TikTokService.name);

  constructor(@Inject(DRIZZLE_DB) db: DrizzleDB, enc: EncryptionService, private readonly config: ConfigService) { super(db, enc); }

  async configureAds(tenantId: string, creds: TikTokAdsCreds) { await this.saveCredentials(tenantId, 'tiktok-ads', creds); return { ok: true }; }
  async getAdsStatus(tenantId: string) { return this.getProviderStatus(tenantId, 'tiktok-ads'); }
  async disconnectAds(tenantId: string) { return this.removeCredentials(tenantId, 'tiktok-ads'); }

  private async getAccessToken(creds: TikTokAdsCreds): Promise<string> {
    const res  = await fetch(`${TIKTOK_ADS}/oauth2/access_token/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: creds.app_id, secret: creds.secret, grant_type: 'client_credential' }) });
    const data = await res.json() as any;
    return data.data?.access_token ?? '';
  }

  async getCampaigns(tenantId: string) {
    const creds = await this.loadCredentials<TikTokAdsCreds>(tenantId, 'tiktok-ads');
    if (!creds) return { error: 'TikTok Ads não configurado' };
    const token = await this.getAccessToken(creds);
    const res   = await fetch(`${TIKTOK_ADS}/campaign/get/`, { method: 'POST', headers: { 'Access-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ advertiser_id: creds.advertiser_id, page_size: 20 }) });
    const data  = await res.json() as any;
    if (data.code !== 0) return { error: data.message };
    return { campaigns: (data.data?.list ?? []).map((c: any) => ({ id: c.campaign_id, name: c.campaign_name, status: c.status, budget: c.budget })), total: data.data?.page_info?.total_number ?? 0 };
  }

  getOAuthUrl(tenantId: string, userId: string): string {
    const clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY') ?? '';
    const redirect  = this.config.get<string>('TIKTOK_REDIRECT_URI') ?? '';
    const state     = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&state=${state}`;
  }
}
```

---

## PASSO 11 — GOOGLE ADS SERVICE

**VERIFICAR:**
```bash
[ -f "apps/api/src/modules/integrations/google-ads/google-ads.service.ts" ] && echo "PASS" || echo "FAIL"
```

**Se FAIL — criar `apps/api/src/modules/integrations/google-ads/google-ads.service.ts`:**

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }  from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v17';
const GOOGLE_TOKEN   = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH    = 'https://accounts.google.com/o/oauth2/v2/auth';

interface GoogleAdsCreds { developer_token: string; client_id: string; client_secret: string; refresh_token?: string; customer_id?: string; manager_account_id?: string; }

@Injectable()
export class GoogleAdsService extends IntegrationBaseService {
  private readonly logger = new Logger(GoogleAdsService.name);

  constructor(@Inject(DRIZZLE_DB) db: DrizzleDB, enc: EncryptionService, private readonly config: ConfigService) { super(db, enc); }

  async configure(tenantId: string, creds: GoogleAdsCreds) { await this.saveCredentials(tenantId, 'google-ads', creds); return { ok: true }; }
  async getStatus(tenantId: string) { return this.getProviderStatus(tenantId, 'google-ads'); }
  async disconnect(tenantId: string) { return this.removeCredentials(tenantId, 'google-ads'); }

  getAuthUrl(tenantId: string, userId: string): string {
    const clientId = this.config.get<string>('GOOGLE_ADS_CLIENT_ID') ?? '';
    const redirect = this.config.get<string>('GOOGLE_ADS_REDIRECT_URI') ?? '';
    const state    = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');
    return `${GOOGLE_AUTH}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const { tenantId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const clientId = this.config.get<string>('GOOGLE_ADS_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('GOOGLE_ADS_CLIENT_SECRET') ?? '';
    const redirect = this.config.get<string>('GOOGLE_ADS_REDIRECT_URI') ?? '';
    const res  = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' }) });
    const data = await res.json() as any;
    const existing = await this.loadCredentials<GoogleAdsCreds>(tenantId, 'google-ads') ?? {} as GoogleAdsCreds;
    await this.saveCredentials(tenantId, 'google-ads', { ...existing, refresh_token: data.refresh_token });
  }

  private async getAccessToken(creds: GoogleAdsCreds): Promise<string> {
    if (!creds.refresh_token) throw new Error('refresh_token não configurado');
    const res  = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: creds.refresh_token, client_id: creds.client_id, client_secret: creds.client_secret, grant_type: 'refresh_token' }) });
    const data = await res.json() as any;
    return data.access_token as string;
  }

  async getCampaigns(tenantId: string) {
    const creds = await this.loadCredentials<GoogleAdsCreds>(tenantId, 'google-ads');
    if (!creds) return { error: 'Google Ads não configurado' };
    const accessToken = await this.getAccessToken(creds);
    const customerId  = creds.customer_id ?? '';
    const query = `SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.impressions DESC LIMIT 20`;
    const res   = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'developer-token': creds.developer_token, 'login-customer-id': creds.manager_account_id ?? customerId, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const data  = await res.json() as any;
    if (data.error) return { error: data.error.message };
    return { campaigns: (data.results ?? []).map((r: any) => ({ id: r.campaign?.id, name: r.campaign?.name, status: r.campaign?.status, impressions: Number(r.metrics?.impressions ?? 0), clicks: Number(r.metrics?.clicks ?? 0), costBrl: (Number(r.metrics?.costMicros ?? 0) / 1_000_000).toFixed(2) })) };
  }
}
```

---

## PASSO 12 — ABRAMUS SERVICE

**VERIFICAR:**
```bash
[ -f "apps/api/src/modules/integrations/abramus/abramus.service.ts" ] && echo "PASS" || echo "FAIL"
```

**Se FAIL — criar `apps/api/src/modules/integrations/abramus/abramus.service.ts`:**

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }  from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

interface AbramusCreds { username: string; password: string; base_url?: string; }

@Injectable()
export class AbramusService extends IntegrationBaseService {
  private readonly logger = new Logger(AbramusService.name);
  private readonly DEFAULT_URL = 'https://api.abramus.org.br';

  constructor(@Inject(DRIZZLE_DB) db: DrizzleDB, enc: EncryptionService) { super(db, enc); }

  async configure(tenantId: string, creds: AbramusCreds) { await this.saveCredentials(tenantId, 'abramus', creds); return { ok: true }; }
  async getStatus(tenantId: string) { return this.getProviderStatus(tenantId, 'abramus'); }
  async disconnect(tenantId: string) { return this.removeCredentials(tenantId, 'abramus'); }

  private async getToken(tenantId: string): Promise<{ token: string; baseUrl: string }> {
    const creds = await this.loadCredentials<AbramusCreds>(tenantId, 'abramus');
    if (!creds) throw new Error('Abramus não configurado');
    const baseUrl = creds.base_url ?? this.DEFAULT_URL;
    const res = await fetch(`${baseUrl}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: creds.username, password: creds.password }) });
    if (!res.ok) throw new Error(`Abramus auth falhou: ${res.status}`);
    const data = await res.json() as any;
    return { token: data.token ?? data.access_token, baseUrl };
  }

  async searchArtist(tenantId: string, query: string) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const res = await fetch(`${baseUrl}/associados/busca?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : { error: `Abramus error: ${res.status}` };
    } catch (e) { return { error: (e as Error).message }; }
  }

  async searchWork(tenantId: string, query: { titulo?: string; compositor?: string; isrc?: string }) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const p = new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([,v]) => v)) as Record<string,string>);
      const res = await fetch(`${baseUrl}/obras/busca?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : { error: `Abramus error: ${res.status}` };
    } catch (e) { return { error: (e as Error).message }; }
  }

  async registerWork(tenantId: string, obra: any) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const res = await fetch(`${baseUrl}/obras/registro`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(obra) });
      return res.json();
    } catch (e) { return { error: (e as Error).message }; }
  }

  async getStatements(tenantId: string, params: { periodo?: string; artista_id?: string }) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v)) as Record<string,string>);
      const res = await fetch(`${baseUrl}/extratos?${q}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : { error: `Abramus error: ${res.status}` };
    } catch (e) { return { error: (e as Error).message }; }
  }
}
```

---

## PASSO 13 — REGISTRAR TODOS NO INTEGRATIONS MODULE

**VERIFICAR:**
```bash
grep -q "AbramusService" apps/api/src/modules/integrations/integrations.module.ts && \
grep -q "SoundCloudService" apps/api/src/modules/integrations/integrations.module.ts && \
echo "PASS" || echo "FAIL"
```

**Se FAIL — substituir `apps/api/src/modules/integrations/integrations.module.ts`:**

```typescript
import { Module }             from '@nestjs/common';
import { BullModule }         from '@nestjs/bullmq';
import { QUEUE_NAMES }        from '../../queues/queue.constants';
import { IntegrationsController } from './integrations.controller';
import { IntegrationBaseService } from './integration-base.service';
import { ACRCloudService }    from './acrcloud/acrcloud.service';
import { AutentiqueService }  from './autentique/autentique.service';
import { SpotifyService }     from './spotify/spotify.service';
import { YouTubeService }     from './youtube/youtube.service';
import { DeezerService }      from './deezer/deezer.service';
import { SoundCloudService }  from './soundcloud/soundcloud.service';
import { AppleMusicService }  from './apple-music/apple-music.service';
import { InstagramService }   from './instagram/instagram.service';
import { TikTokService }      from './tiktok/tiktok.service';
import { GoogleAdsService }   from './google-ads/google-ads.service';
import { AbramusService }     from './abramus/abramus.service';

const ALL_SERVICES = [
  IntegrationBaseService, ACRCloudService, AutentiqueService,
  SpotifyService, YouTubeService, DeezerService,
  SoundCloudService, AppleMusicService, InstagramService,
  TikTokService, GoogleAdsService, AbramusService,
];

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.STREAMING_SYNC }),
    BullModule.registerQueue({ name: QUEUE_NAMES.INTEGRATIONS_SYNC }),
  ],
  controllers: [IntegrationsController],
  providers: ALL_SERVICES,
  exports:   ALL_SERVICES,
})
export class IntegrationsModule {}
```

---

## PASSO 14 — CONTROLLER COMPLETO DE INTEGRAÇÕES

**VERIFICAR:**
```bash
grep -q "abramus" apps/api/src/modules/integrations/integrations.controller.ts && \
grep -q "soundcloud" apps/api/src/modules/integrations/integrations.controller.ts && \
echo "PASS" || echo "FAIL"
```

**Se FAIL — substituir `apps/api/src/modules/integrations/integrations.controller.ts` completamente com o controller abaixo:**

```typescript
import {
  Controller, Get, Post, Delete, Body, Param, Query,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ACRCloudService }    from './acrcloud/acrcloud.service';
import { AutentiqueService }  from './autentique/autentique.service';
import { SpotifyService }     from './spotify/spotify.service';
import { YouTubeService }     from './youtube/youtube.service';
import { DeezerService }      from './deezer/deezer.service';
import { SoundCloudService }  from './soundcloud/soundcloud.service';
import { AppleMusicService }  from './apple-music/apple-music.service';
import { InstagramService }   from './instagram/instagram.service';
import { TikTokService }      from './tiktok/tiktok.service';
import { GoogleAdsService }   from './google-ads/google-ads.service';
import { AbramusService }     from './abramus/abramus.service';
import { ConfigureAutentiqueDto, SendForSignatureDto, RecognizeAudioDto, SpotifyConnectDto, SyncSpotifyArtistDto } from './dto/integrations.dto';

@ApiTags('Integrations')
@ApiBearerAuth('Clerk JWT')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly acrCloud:   ACRCloudService,
    private readonly autentique: AutentiqueService,
    private readonly spotify:    SpotifyService,
    private readonly youtube:    YouTubeService,
    private readonly deezer:     DeezerService,
    private readonly soundcloud: SoundCloudService,
    private readonly appleMusic: AppleMusicService,
    private readonly instagram:  InstagramService,
    private readonly tiktok:     TikTokService,
    private readonly googleAds:  GoogleAdsService,
    private readonly abramus:    AbramusService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      acrcloud:   { configured: this.acrCloud.isConfigured() },
      autentique: { configured: true },
      spotify:    { configured: this.spotify.isConfigured() },
      youtube:    { configured: this.youtube.isConfigured() },
      deezer:     { configured: this.deezer.isConfigured() },
      soundcloud: { configured: this.soundcloud.isConfigured() },
    };
  }

  // ── ACRCloud ──────────────────────────────────────────────────────────────
  @Post('acrcloud/recognize') @HttpCode(200)
  recognizeAudio(@Body() dto: RecognizeAudioDto) { return this.acrCloud.recognize(dto.audioBase64); }

  // ── Autentique ────────────────────────────────────────────────────────────
  @Post('autentique/configure') @HttpCode(200)
  configureAutentique(@Request() req: any, @Body() dto: ConfigureAutentiqueDto) { return this.autentique.configure(req.tenantId, dto.apiToken); }
  @Post('autentique/send')
  sendForSignature(@Request() req: any, @Body() dto: SendForSignatureDto) { return this.autentique.sendForSignature({ tenantId: req.tenantId, contractId: dto.contractId, name: dto.name, fileBase64: dto.fileBase64, signers: dto.signers }); }
  @Post('autentique/webhook') @HttpCode(200)
  autentiqueWebhook(@Body() payload: any) { return this.autentique.handleWebhook(payload); }

  // ── Spotify ───────────────────────────────────────────────────────────────
  @Get('spotify/auth')
  spotifyAuth(@Request() req: any) { return { url: this.spotify.getAuthUrl(req.tenantId, req.userId) }; }
  @Post('spotify/callback') @HttpCode(200)
  spotifyCallback(@Body() dto: SpotifyConnectDto) { return this.spotify.handleCallback(dto.code, dto.state); }
  @Post('spotify/sync-artist') @HttpCode(200)
  syncSpotify(@Request() req: any, @Body() dto: SyncSpotifyArtistDto) { return this.spotify.syncArtistMetrics(req.tenantId, dto.spotifyArtistId); }
  @Delete('spotify/disconnect') @HttpCode(204)
  spotifyDisconnect(@Request() req: any) { return this.spotify.disconnect(req.tenantId, req.userId); }

  // ── YouTube ───────────────────────────────────────────────────────────────
  @Get('youtube/status') youtubeStatus() { return { configured: this.youtube.isConfigured() }; }
  @Get('youtube/channel/:id') getYTChannel(@Param('id') id: string) { return this.youtube.getChannelStats(id); }
  @Get('youtube/video/:id')   getYTVideo(@Param('id') id: string)   { return this.youtube.getVideoStats(id); }
  @Get('youtube/search')      searchYT(@Query('q') q: string, @Query('limit') l?: string) { return this.youtube.searchVideos(q, l ? +l : 10); }

  // ── Deezer ────────────────────────────────────────────────────────────────
  @Get('deezer/artist/:id')      getDeezerArtist(@Param('id') id: string) { return this.deezer.getArtistStats(id); }
  @Get('deezer/artist/:id/top')  getDeezerTop(@Param('id') id: string, @Query('limit') l?: string) { return this.deezer.getTopTracks(id, l ? +l : 10); }
  @Get('deezer/album/:id')       getDeezerAlbum(@Param('id') id: string) { return this.deezer.getAlbum(id); }
  @Get('deezer/search')          searchDeezer(@Query('q') q: string, @Query('limit') l?: string) { return this.deezer.searchArtist(q, l ? +l : 5); }

  // ── SoundCloud ────────────────────────────────────────────────────────────
  @Post('soundcloud/configure') @HttpCode(200)
  configureSC(@Request() req: any, @Body() body: any) { return this.soundcloud.configure(req.tenantId, body); }
  @Get('soundcloud/status')  getSCStatus(@Request() req: any) { return this.soundcloud.getStatus(req.tenantId); }
  @Delete('soundcloud/disconnect') @HttpCode(204)
  disconnectSC(@Request() req: any) { return this.soundcloud.disconnect(req.tenantId); }
  @Get('soundcloud/user/:permalink') getSCUser(@Param('permalink') p: string) { return this.soundcloud.resolveUser(p); }
  @Get('soundcloud/track/:id')       getSCTrack(@Param('id') id: string) { return this.soundcloud.getTrackStats(id); }
  @Get('soundcloud/search')          searchSC(@Query('q') q: string, @Query('limit') l?: string) { return this.soundcloud.searchTracks(q, l ? +l : 10); }

  // ── Apple Music ───────────────────────────────────────────────────────────
  @Post('apple-music/configure') @HttpCode(200)
  configureAM(@Request() req: any, @Body() body: any) { return this.appleMusic.configure(req.tenantId, body); }
  @Get('apple-music/status')  getAMStatus(@Request() req: any) { return this.appleMusic.getStatus(req.tenantId); }
  @Delete('apple-music/disconnect') @HttpCode(204)
  disconnectAM(@Request() req: any) { return this.appleMusic.disconnect(req.tenantId); }
  @Get('apple-music/artist/:id')
  getAMArtist(@Request() req: any, @Param('id') id: string, @Query('storefront') sf = 'br') { return this.appleMusic.getArtist(id, sf, req.tenantId); }
  @Get('apple-music/search')
  searchAM(@Request() req: any, @Query('q') q: string, @Query('storefront') sf = 'br') { return this.appleMusic.search(q, sf, req.tenantId); }

  // ── Instagram ─────────────────────────────────────────────────────────────
  @Get('instagram/auth')       instagramAuth(@Request() req: any) { return { url: this.instagram.getAuthUrl(req.tenantId, req.userId) }; }
  @Post('instagram/callback') @HttpCode(200)
  instagramCallback(@Body() body: { code: string; state: string }) { return this.instagram.handleCallback(body.code, body.state); }
  @Get('instagram/status')     getIGStatus(@Request() req: any) { return this.instagram.getStatus(req.tenantId); }
  @Get('instagram/metrics')    getIGMetrics(@Request() req: any) { return this.instagram.getAccountMetrics(req.tenantId, req.userId); }
  @Delete('instagram/disconnect') @HttpCode(204)
  disconnectIG(@Request() req: any) { return this.instagram.disconnectProvider(req.tenantId, req.userId); }

  // ── TikTok ────────────────────────────────────────────────────────────────
  @Post('tiktok-ads/configure') @HttpCode(200)
  configureTT(@Request() req: any, @Body() body: any) { return this.tiktok.configureAds(req.tenantId, body); }
  @Get('tiktok-ads/status')     getTTStatus(@Request() req: any) { return this.tiktok.getAdsStatus(req.tenantId); }
  @Delete('tiktok-ads/disconnect') @HttpCode(204)
  disconnectTT(@Request() req: any) { return this.tiktok.disconnectAds(req.tenantId); }
  @Get('tiktok-ads/campaigns')  getTTCampaigns(@Request() req: any) { return this.tiktok.getCampaigns(req.tenantId); }
  @Get('tiktok/auth')           tikTokAuth(@Request() req: any) { return { url: this.tiktok.getOAuthUrl(req.tenantId, req.userId) }; }

  // ── Google Ads ────────────────────────────────────────────────────────────
  @Post('google-ads/configure') @HttpCode(200)
  configureGA(@Request() req: any, @Body() body: any) { return this.googleAds.configure(req.tenantId, body); }
  @Get('google-ads/auth')       getGAAuth(@Request() req: any) { return { url: this.googleAds.getAuthUrl(req.tenantId, req.userId) }; }
  @Post('google-ads/callback') @HttpCode(200)
  gaCallback(@Body() body: { code: string; state: string }) { return this.googleAds.handleCallback(body.code, body.state); }
  @Get('google-ads/status')     getGAStatus(@Request() req: any) { return this.googleAds.getStatus(req.tenantId); }
  @Delete('google-ads/disconnect') @HttpCode(204)
  disconnectGA(@Request() req: any) { return this.googleAds.disconnect(req.tenantId); }
  @Get('google-ads/campaigns')  getGACampaigns(@Request() req: any) { return this.googleAds.getCampaigns(req.tenantId); }

  // ── Abramus ───────────────────────────────────────────────────────────────
  @Post('abramus/configure') @HttpCode(200)
  configureAb(@Request() req: any, @Body() body: any) { return this.abramus.configure(req.tenantId, body); }
  @Get('abramus/status')     getAbStatus(@Request() req: any) { return this.abramus.getStatus(req.tenantId); }
  @Delete('abramus/disconnect') @HttpCode(204)
  disconnectAb(@Request() req: any) { return this.abramus.disconnect(req.tenantId); }
  @Get('abramus/search/artist')
  searchAbArtist(@Request() req: any, @Query('q') q: string) { return this.abramus.searchArtist(req.tenantId, q); }
  @Get('abramus/search/work')
  searchAbWork(@Request() req: any, @Query('titulo') titulo?: string, @Query('compositor') compositor?: string, @Query('isrc') isrc?: string) { return this.abramus.searchWork(req.tenantId, { titulo, compositor, isrc }); }
  @Post('abramus/register/work') @HttpCode(201)
  registerAbWork(@Request() req: any, @Body() body: any) { return this.abramus.registerWork(req.tenantId, body); }
  @Get('abramus/statements')
  getAbStatements(@Request() req: any, @Query('periodo') periodo?: string, @Query('artista_id') artista_id?: string) { return this.abramus.getStatements(req.tenantId, { periodo, artista_id }); }
}
```

---

## PASSO 15 — HOOKS FRONTEND SEM LOCALSTORAGE

**VERIFICAR:**
```bash
grep -rl "sessionStorage\|localStorage" \
  client/src/modules/integrations/hooks/useSpotify.ts \
  client/src/modules/integrations/hooks/useSoundCloud.ts \
  client/src/modules/integrations/hooks/useAppleMusic.ts \
  client/src/modules/integrations/hooks/useGoogleAds.ts \
  client/src/modules/integrations/hooks/useTikTokAds.ts \
  client/src/modules/integrations/hooks/useYouTube.ts \
  2>/dev/null | wc -l | xargs -I{} bash -c '[ {} -eq 0 ] && echo "PASS" || echo "FAIL"'
```

**Se FAIL — para cada hook listado abaixo, substituir completamente:**

`client/src/modules/integrations/hooks/useSpotify.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api }   from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useSpotifyStatus() {
  return useQuery({ queryKey: ['integrations','spotify','status'], queryFn: () => MOCK_MODE ? Promise.resolve({ connected: false }) : api.get('/integrations/status').then((r:any) => ({ ...r.spotify, has_credentials: r.spotify?.configured })), staleTime: 60000 });
}
export function useSpotifyConnect() {
  return useMutation({ mutationFn: async () => { if (MOCK_MODE) return; const { url } = await api.get<{url:string}>('/integrations/spotify/auth'); window.open(url, '_blank', 'width=500,height=700'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useSpotifyArtistMetrics(spotifyArtistId?: string) {
  return useQuery({ queryKey: ['integrations','spotify','artist',spotifyArtistId], queryFn: () => api.post('/integrations/spotify/sync-artist', { spotifyArtistId }), enabled: !MOCK_MODE && !!spotifyArtistId, staleTime: 300000 });
}
export function useSpotifyDisconnect() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.delete('/integrations/spotify/disconnect'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','spotify'] }); toast.success('Spotify desconectado.'); }, onError: (e: Error) => toast.error(e.message) });
}
// Manter useSpotifySaveCredentials e useSpotifyDeleteCredentials como aliases para compatibilidade
export const useSpotifySaveCredentials = useSpotifyConnect;
export const useSpotifyDeleteCredentials = useSpotifyDisconnect;
```

`client/src/modules/integrations/hooks/useSoundCloud.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api }   from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useSoundCloudStatus() {
  return useQuery({ queryKey: ['integrations','soundcloud','status'], queryFn: () => MOCK_MODE ? Promise.resolve({ connected: false, status: 'mock' }) : api.get('/integrations/soundcloud/status'), staleTime: 60000 });
}
export function useSoundCloudSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (c: any) => api.post('/integrations/soundcloud/configure', c), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','soundcloud'] }); toast.success('SoundCloud configurado.'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useSoundCloudDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.delete('/integrations/soundcloud/disconnect'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','soundcloud'] }); toast.success('SoundCloud desconectado.'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useSoundCloudArtistMetrics(permalink?: string) {
  return useQuery({ queryKey: ['integrations','soundcloud','user',permalink], queryFn: () => api.get(`/integrations/soundcloud/user/${permalink}`), enabled: !MOCK_MODE && !!permalink, staleTime: 300000 });
}
export function useSoundCloudTrackMetrics(trackId?: string) {
  return useQuery({ queryKey: ['integrations','soundcloud','track',trackId], queryFn: () => api.get(`/integrations/soundcloud/track/${trackId}`), enabled: !MOCK_MODE && !!trackId, staleTime: 300000 });
}
```

`client/src/modules/integrations/hooks/useAppleMusic.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api }   from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useAppleMusicStatus() {
  return useQuery({ queryKey: ['integrations','apple-music','status'], queryFn: () => MOCK_MODE ? Promise.resolve({ connected: false }) : api.get('/integrations/apple-music/status'), staleTime: 60000 });
}
export function useAppleMusicSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (c: any) => api.post('/integrations/apple-music/configure', c), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','apple-music'] }); toast.success('Apple Music configurado.'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useAppleMusicDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.delete('/integrations/apple-music/disconnect'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','apple-music'] }); toast.success('Apple Music desconectado.'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useAppleMusicArtistMetrics(artistId?: string) {
  return useQuery({ queryKey: ['integrations','apple-music','artist',artistId], queryFn: () => api.get(`/integrations/apple-music/artist/${artistId}`), enabled: !MOCK_MODE && !!artistId, staleTime: 300000 });
}
```

`client/src/modules/integrations/hooks/useGoogleAds.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api }   from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useGoogleAdsStatus() {
  return useQuery({ queryKey: ['integrations','google-ads','status'], queryFn: () => MOCK_MODE ? Promise.resolve({ connected: false }) : api.get('/integrations/google-ads/status'), staleTime: 60000 });
}
export function useGoogleAdsSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (c: any) => api.post('/integrations/google-ads/configure', c), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','google-ads'] }); toast.success('Google Ads configurado.'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useGoogleAdsConnect() {
  return useMutation({ mutationFn: async () => { if (MOCK_MODE) return; const { url } = await api.get<{url:string}>('/integrations/google-ads/auth'); window.open(url,'_blank','width=600,height=700'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useGoogleAdsCampaigns() {
  return useQuery({ queryKey: ['integrations','google-ads','campaigns'], queryFn: () => api.get('/integrations/google-ads/campaigns'), enabled: !MOCK_MODE, staleTime: 300000 });
}
export function useGoogleAdsDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.delete('/integrations/google-ads/disconnect'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','google-ads'] }); toast.success('Google Ads desconectado.'); }, onError: (e: Error) => toast.error(e.message) });
}
```

`client/src/modules/integrations/hooks/useTikTokAds.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api }   from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useTikTokAdsStatus() {
  return useQuery({ queryKey: ['integrations','tiktok-ads','status'], queryFn: () => MOCK_MODE ? Promise.resolve({ connected: false }) : api.get('/integrations/tiktok-ads/status'), staleTime: 60000 });
}
export function useTikTokAdsSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (c: any) => api.post('/integrations/tiktok-ads/configure', c), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','tiktok-ads'] }); toast.success('TikTok Ads configurado.'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useTikTokAdsCampaigns() {
  return useQuery({ queryKey: ['integrations','tiktok-ads','campaigns'], queryFn: () => api.get('/integrations/tiktok-ads/campaigns'), enabled: !MOCK_MODE, staleTime: 300000 });
}
export function useTikTokAdsDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.delete('/integrations/tiktok-ads/disconnect'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','tiktok-ads'] }); toast.success('TikTok Ads desconectado.'); }, onError: (e: Error) => toast.error(e.message) });
}
```

`client/src/modules/integrations/hooks/useYouTube.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api }   from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useYouTubeStatus() {
  return useQuery({ queryKey: ['integrations','youtube','status'], queryFn: () => MOCK_MODE ? Promise.resolve({ connected: false }) : api.get('/integrations/youtube/status'), staleTime: 60000 });
}
export function useYouTubeSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (c: any) => api.post('/integrations/soundcloud/configure', c), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','youtube'] }); toast.success('YouTube configurado.'); }, onError: (e: Error) => toast.error(e.message) });
}
export function useYouTubeChannelMetrics(channelId?: string) {
  return useQuery({ queryKey: ['integrations','youtube','channel',channelId], queryFn: () => api.get(`/integrations/youtube/channel/${channelId}`), enabled: !MOCK_MODE && !!channelId, staleTime: 300000 });
}
export function useYouTubeDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => Promise.resolve(), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations','youtube'] }); toast.success('YouTube desconectado.'); } });
}
```

---

## PASSO 16 — VERIFICAR api-client TEM MÉTODO delete

**VERIFICAR:**
```bash
grep -q "delete:" client/src/shared/lib/api-client.ts && echo "PASS" || echo "FAIL"
```

**Se FAIL — abrir `client/src/shared/lib/api-client.ts` e localizar o objeto `api` exportado.
Adicionar o método `delete` junto aos outros métodos (`get`, `post`, `patch`, `put`):**

```typescript
delete: <T>(path: string, init?: RequestInit) =>
  request<T>(path, { ...init, method: 'DELETE' }),
```

---

## PASSO 17 — TYPECHECK FINAL

```bash
cd apps/api
npx tsc --noEmit 2>&1 | grep "error TS" | head -30
cd ../..
```

Corrigir cada erro TypeScript encontrado.

Erros comuns:
- `count is not exported` → adicionar `count` ao import do drizzle-orm
- `Property X does not exist` → verificar que os DTOs foram atualizados
- `Cannot find module './soundcloud/soundcloud.service'` → verificar caminho do arquivo

---

## PASSO 18 — BUILD E TESTES FINAIS

```bash
cd apps/api && npm run build 2>&1 | tail -10
cd ../..
npm run build 2>&1 | tail -10
cd apps/api && npm run test 2>&1 | tail -20
cd ../..
```

---

## RELATÓRIO FINAL

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MUSIC OS 360° — STATUS FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check() {
  local label=$1; local cmd=$2; local expected=$3
  local result
  result=$(eval "$cmd" 2>/dev/null | tail -1)
  if echo "$result" | grep -q "$expected"; then
    echo "✅ $label"
  else
    echo "❌ $label → got: $result"
  fi
}

check "HR Service com criptografia"     "grep -c encryptNullable apps/api/src/modules/hr/hr.service.ts" "[1-9]"
check "Paginação em artist-goals"       "grep -c 'meta:' apps/api/src/modules/artist-goals/artist-goals.service.ts" "[1-9]"
check "Paginação em content-detections" "grep -c 'meta:' apps/api/src/modules/content-detections/content-detections.service.ts" "[1-9]"
check "Paginação em ecad-reports"       "grep -c 'meta:' apps/api/src/modules/ecad-reports/ecad-reports.service.ts" "[1-9]"
check "PENDING_TABLES vazio"            "grep -c 'pending:' client/src/shared/lib/api-client.ts" "^0$"
check "FeatureGate na Agenda"           "grep -c FeatureGate client/src/modules/events/pages/Agenda.tsx" "[1-9]"
check "Migrations geradas"             "ls apps/api/drizzle/*.sql | wc -l" "[2-9]"
check "IntegrationBaseService existe"  "ls apps/api/src/modules/integrations/integration-base.service.ts" "integration"
check "SoundCloud service"             "ls apps/api/src/modules/integrations/soundcloud/soundcloud.service.ts" "soundcloud"
check "Apple Music service"            "ls apps/api/src/modules/integrations/apple-music/apple-music.service.ts" "apple"
check "Instagram service"              "ls apps/api/src/modules/integrations/instagram/instagram.service.ts" "instagram"
check "TikTok service"                 "ls apps/api/src/modules/integrations/tiktok/tiktok.service.ts" "tiktok"
check "Google Ads service"             "ls apps/api/src/modules/integrations/google-ads/google-ads.service.ts" "google"
check "Abramus service"                "ls apps/api/src/modules/integrations/abramus/abramus.service.ts" "abramus"
check "Hooks sem sessionStorage"       "grep -rl sessionStorage client/src/modules/integrations/hooks/useSpotify.ts client/src/modules/integrations/hooks/useSoundCloud.ts 2>/dev/null | wc -l" "^0$"
check "TypeScript sem erros"           "cd apps/api && npx tsc --noEmit 2>&1 | grep -c 'error TS'" "^0$"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Itens com ❌ precisam ser corrigidos."
echo "Execute este prompt novamente após as correções."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```
