import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }               from '../../database/database.module';
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
  ) {}

  // ── Employees ──────────────────────────────────────────────────────────────

  async listEmployees(tenantId: string) {
    return this.db
      .select()
      .from(employees)
      .where(and(eq(employees.tenant_id, tenantId), isNull(employees.deleted_at)))
      .orderBy(desc(employees.created_at));
  }

  async findEmployee(tenantId: string, id: string): Promise<Employee> {
    const [result] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id), isNull(employees.deleted_at)))
      .limit(1);

    if (!result) throw new NotFoundException('Funcionário não encontrado');
    return result;
  }

  async createEmployee(tenantId: string, userId: string, dto: CreateEmployeeDto): Promise<Employee> {
    const [created] = await this.db
      .insert(employees)
      .values({
        tenant_id:          tenantId,
        nome:               dto.nome,
        cargo:              dto.cargo              ?? null,
        departamento:       dto.departamento       ?? null,
        tipo_contrato:      dto.tipo_contrato      ?? 'clt',
        status:             dto.status             ?? 'ativo',
        email_encrypted:    dto.email_encrypted    ?? null,
        telefone_encrypted: dto.telefone_encrypted ?? null,
        cpf_encrypted:      dto.cpf_encrypted      ?? null,
        salario:            dto.salario            ?? null,
        data_admissao:      dto.data_admissao      ? new Date(dto.data_admissao) : null,
        data_demissao:      dto.data_demissao      ? new Date(dto.data_demissao) : null,
        documentos:         dto.documentos         ?? [],
        metadata:           dto.metadata           ?? {},
        created_by:         userId,
      })
      .returning();

    return created;
  }

  async updateEmployee(tenantId: string, userId: string, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    await this.findEmployee(tenantId, id);

    const [updated] = await this.db
      .update(employees)
      .set({
        ...(dto.nome               != null && { nome:               dto.nome }),
        ...(dto.cargo              != null && { cargo:              dto.cargo }),
        ...(dto.departamento       != null && { departamento:       dto.departamento }),
        ...(dto.tipo_contrato      != null && { tipo_contrato:      dto.tipo_contrato }),
        ...(dto.status             != null && { status:             dto.status }),
        ...(dto.email_encrypted    != null && { email_encrypted:    dto.email_encrypted }),
        ...(dto.telefone_encrypted != null && { telefone_encrypted: dto.telefone_encrypted }),
        ...(dto.cpf_encrypted      != null && { cpf_encrypted:      dto.cpf_encrypted }),
        ...(dto.salario            != null && { salario:            dto.salario }),
        ...(dto.documentos         != null && { documentos:         dto.documentos }),
        ...(dto.metadata           != null && { metadata:           dto.metadata }),
        ...(dto.data_admissao      != null && { data_admissao:      new Date(dto.data_admissao) }),
        ...(dto.data_demissao      != null && { data_demissao:      new Date(dto.data_demissao) }),
        updated_at: new Date(),
      })
      .where(and(eq(employees.tenant_id, tenantId), eq(employees.id, id), isNull(employees.deleted_at)))
      .returning();

    return updated;
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

  async listPayroll(tenantId: string) {
    return this.db
      .select()
      .from(payrollEntries)
      .where(and(eq(payrollEntries.tenant_id, tenantId), isNull(payrollEntries.deleted_at)))
      .orderBy(desc(payrollEntries.created_at));
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

  async listLeaveRequests(tenantId: string) {
    return this.db
      .select()
      .from(leaveRequests)
      .where(and(eq(leaveRequests.tenant_id, tenantId), isNull(leaveRequests.deleted_at)))
      .orderBy(desc(leaveRequests.created_at));
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
