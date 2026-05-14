import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, count }          from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }                 from '../../database/database.module';
import { EncryptionService }                     from '../../core/security/encryption.service';
import {
  employees, Employee,
  payrollEntries, PayrollEntry,
  leaveRequests, LeaveRequest,
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

  private mapEmployee(e: Employee) {
    return {
      ...e,
      email:              this.enc.decryptNullable(e.email_encrypted),
      telefone:           this.enc.decryptNullable(e.telefone_encrypted),
      cpf:                this.enc.decryptNullable(e.cpf_encrypted),
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
      data: rows.map(e => this.mapEmployee(e)),
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  private async _findRaw(tenantId: string, id: string): Promise<Employee> {
    const [result] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id), isNull(employees.deleted_at)))
      .limit(1);
    if (!result) throw new NotFoundException('Funcionário não encontrado');
    return result;
  }

  async findEmployee(tenantId: string, id: string) {
    const raw = await this._findRaw(tenantId, id);
    return this.mapEmployee(raw);
  }

  async createEmployee(tenantId: string, userId: string, dto: CreateEmployeeDto) {
    const [created] = await this.db
      .insert(employees)
      .values({
        tenant_id:          tenantId,
        nome:               dto.nome,
        cargo:              dto.cargo         ?? null,
        departamento:       dto.departamento  ?? null,
        tipo_contrato:      dto.tipo_contrato ?? 'clt',
        status:             dto.status        ?? 'ativo',
        email_encrypted:    this.enc.encryptNullable(dto.email),
        telefone_encrypted: this.enc.encryptNullable(dto.telefone),
        cpf_encrypted:      this.enc.encryptNullable(dto.cpf),
        salario:            dto.salario       ?? null,
        data_admissao:      dto.data_admissao ? new Date(dto.data_admissao) : null,
        data_demissao:      dto.data_demissao ? new Date(dto.data_demissao) : null,
        documentos:         dto.documentos    ?? [],
        metadata:           dto.metadata      ?? {},
        created_by:         userId,
      })
      .returning();
    return this.mapEmployee(created);
  }

  async updateEmployee(tenantId: string, userId: string, id: string, dto: UpdateEmployeeDto) {
    await this._findRaw(tenantId, id);
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
    await this._findRaw(tenantId, id);
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
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(payrollEntries).where(where),
    ]);
    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
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
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(leaveRequests).where(where),
    ]);
    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async createLeaveRequest(tenantId: string, userId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const [created] = await this.db
      .insert(leaveRequests)
      .values({
        tenant_id:    tenantId,
        employee_id:  dto.employee_id,
        tipo:         dto.tipo,
        data_inicio:  new Date(dto.data_inicio),
        data_fim:     new Date(dto.data_fim),
        status:       dto.status       ?? 'pendente',
        motivo:       dto.motivo       ?? null,
        aprovado_por: dto.aprovado_por ?? null,
        documento_url: dto.documento_url ?? null,
        metadata:     dto.metadata     ?? {},
        created_by:   userId,
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
