/**
 * modules/reports/entity-metadata.types.ts
 *
 * FASE 1 — tipos do inventário entity-driven da Central de Relatórios.
 * A fonte da verdade é o backend (entidades TypeORM), nunca o frontend.
 */

/** Classificação explícita e obrigatória de toda entidade persistida. */
export enum EntityCategory {
  /** Entidade operacional de negócio, elegível para export/import. */
  REPORTABLE = 'REPORTABLE',
  /** Operacional, porém não exportável por padrão (sub-entidade, ruído). */
  NOT_REPORTABLE = 'NOT_REPORTABLE',
  /** Estrutura interna do domínio (não voltada ao usuário final). */
  INTERNAL = 'INTERNAL',
  /** Tabela de junção / N:N. */
  JUNCTION = 'JUNCTION',
  /** Infraestrutura (logs, eventos, filas, jobs, org/tenant structure). */
  INFRA = 'INFRA',
  /** Segurança / RBAC / auth / auditoria. */
  SECURITY = 'SECURITY',
  /** Cobrança / assinatura. */
  BILLING = 'BILLING',
  /** Infra interna de IA (Skills/Automações — invisível ao usuário). */
  AI_INTERNAL = 'AI_INTERNAL',
  /** Sem classificação — DEVE falhar o teste se ocorrer. */
  UNKNOWN = 'UNKNOWN',
}

export interface ColumnMeta {
  name: string;
  /** Label pt-BR explícito (camada central). `null` quando ainda não traduzido. */
  label: string | null;
  type: string;
  nullable: boolean;
  primary: boolean;
  generated: boolean;
  isEnum: boolean;
  enumValues?: string[];
  isCreatedAt: boolean;
  isUpdatedAt: boolean;
  isDeletedAt: boolean;
  isTenantId: boolean;
}

export interface RelationMeta {
  property: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  target: string;
}

export interface EntityReport {
  entityName: string;
  tableName: string;
  category: EntityCategory;
  reportable: boolean;
  columns: ColumnMeta[];
  relations: RelationMeta[];
  hasTenantId: boolean;
  hasSoftDelete: boolean;
  hasTimestamps: boolean;
  risks: string[];
  /**
   * Tabela física existe no banco. Preenchido no overlay de disponibilidade
   * (controller). `undefined` quando a verificação não foi aplicada (ex.: scan
   * puro de metadata, sem DataSource).
   */
  available?: boolean;
}

export interface EntitiesInventory {
  totalEntities: number;
  reportableEntities: number;
  nonReportableEntities: number;
  unknownEntities: number;
  entities: EntityReport[];
}
