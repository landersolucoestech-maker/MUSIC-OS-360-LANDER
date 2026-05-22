/**
 * database/entities.ts
 *
 * TypeORM entity classes for MUSIC OS 360 API.
 * Status fields are typed with enums from @music-os-360/types.
 * Key domain relations declared via @ManyToOne / @OneToMany.
 */

import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  ManyToOne, OneToMany, ManyToMany, JoinColumn, JoinTable, Relation,
} from 'typeorm';

import {
  TenantPlan,
  BillingStatus,
  SystemRole,
  ArtistStatus,
  ArtistStatusCadastro,
  ContractStatus,
  WorkStatus,
  PhonogramStatus,
  ReleaseStatus,
  ShareStatus,
  TransactionTipo,
  TransactionStatus,
  InvoiceStatus,
  ClientStatus,
  LeadStatus,
  CampaignStatus,
  BriefingStatus,
  EventStatus,
  ProjectStatus,
  TakedownStatus,
  ContentDetectionStatus,
  SupportTicketStatus,
  SupportTicketPriority,
  UploadStatus,
  IntegrationStatus,
  WebhookEventStatus,
  AIJobStatus,
  EcadReportStatus,
  EmployeeStatus,
  PayrollStatus,
  LeaveRequestStatus,
  ArtistGoalStatus,
  NotificationType,
} from '@music-os-360/types';

// ─── Organizations ────────────────────────────────────────────────────────────
@Entity('organizations')
@Index(['external_auth_org_id'])
@Index(['slug'])
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) external_auth_org_id: string | null;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 100, unique: true }) slug: string;
  @Column({ type: 'varchar', length: 50, default: TenantPlan.STARTER }) plan: TenantPlan;
  @Column({ type: 'varchar', length: 50, default: BillingStatus.TRIAL }) billing_status: BillingStatus;
  @Column({ type: 'varchar', length: 100, default: 'gravadora' }) industry: string;
  @Column({ type: 'text', nullable: true }) cnpj_encrypted: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) phone: string | null;
  @Column({ type: 'jsonb', default: {} }) address: Record<string, unknown>;
  @Column({ type: 'jsonb', default: {} }) config: Record<string, unknown>;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
@Entity('tenants')
@Index(['external_auth_org_id'])
@Index(['slug'])
@Index(['org_id'])
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) org_id: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) external_auth_org_id: string | null;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 100, unique: true }) slug: string;
  @Column({ type: 'varchar', length: 50, default: TenantPlan.STARTER }) plan: TenantPlan;
  @Column({ type: 'jsonb', default: {} }) features: Record<string, unknown>;
  @Column({ type: 'jsonb', default: {} }) settings: Record<string, unknown>;
  @Column({ type: 'boolean', default: true }) active: boolean;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
}

// ─── Org Members ──────────────────────────────────────────────────────────────
@Entity('org_members')
@Index(['tenant_id', 'auth_user_id'], { unique: true })
@Index(['tenant_id'])
@Index(['auth_user_id'])
export class OrgMemberEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) org_id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) auth_user_id: string;
  @Column({ type: 'varchar', length: 255 }) email: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) full_name: string | null;
  /** Role armazenado como string — alinhado com SystemRole values */
  @Column({ type: 'varchar', length: 50, default: SystemRole.VIEWER }) role: string;
  @Column({ type: 'boolean', default: true }) is_active: boolean;
  @Column({ type: 'timestamp', nullable: true }) joined_at: Date | null;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
}

// ─── Billing Subscriptions ────────────────────────────────────────────────────
@Entity('billing_subscriptions')
@Index(['org_id'])
export class BillingSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) org_id: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) stripe_customer_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) stripe_sub_id: string | null;
  @Column({ type: 'varchar', length: 50, default: TenantPlan.STARTER }) plan: TenantPlan;
  @Column({ type: 'varchar', length: 50, default: BillingStatus.TRIAL }) status: BillingStatus;
  @Column({ type: 'timestamp', nullable: true }) trial_ends_at: Date | null;
  @Column({ type: 'timestamp', nullable: true }) current_period_end: Date | null;
  @Column({ type: 'integer', default: 3 }) seats: number;
  @Column({ type: 'integer', default: 1 }) seats_used: number;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
}

// ─── Artists ──────────────────────────────────────────────────────────────────
@Entity('artists')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'deleted_at'])
export class ArtistEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) nome_artistico: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) nome_civil: string | null;
  @Column({ type: 'varchar', length: 50, default: 'solo' }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: ArtistStatus.EM_NEGOCIACAO }) status: ArtistStatus;
  @Column({ type: 'varchar', length: 50, default: ArtistStatusCadastro.ATIVO }) status_cadastro: ArtistStatusCadastro;
  @Column({ type: 'varchar', length: 100, nullable: true }) genero_musical: string | null;
  @Column({ type: 'text', nullable: true }) email_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) telefone_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) cpf_cnpj_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) foto_url: string | null;
  @Column({ type: 'text', nullable: true }) banner_url: string | null;
  @Column({ type: 'jsonb', default: [] }) galeria_urls: unknown[];
  @Column({ type: 'text', nullable: true }) video_apresentacao_url: string | null;
  @Column({ type: 'jsonb', default: [] }) documentos: unknown[];
  @Column({ type: 'text', nullable: true }) observacoes: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) manager_nome: string | null;
  @Column({ type: 'text', nullable: true }) manager_contato_encrypted: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) produtor_executivo: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) agencia_booking: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) label_parceira: string | null;
  @Column({ type: 'jsonb', default: [] }) especialidades: unknown[];
  @Column({ type: 'varchar', length: 255, nullable: true }) spotify_artist_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) youtube_channel_id: string | null;
  @Column({ type: 'text', nullable: true }) deezer_url: string | null;
  @Column({ type: 'text', nullable: true }) apple_music_url: string | null;
  @Column({ type: 'text', nullable: true }) soundcloud_url: string | null;
  @Column({ type: 'uuid', nullable: true }) contrato_id: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) org_slug: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @OneToMany(() => PhonogramEntity, (p) => p.artist)
  phonograms: Relation<PhonogramEntity[]>;

  @OneToMany(() => WorkEntity, (w) => w.artist)
  works: Relation<WorkEntity[]>;

  @OneToMany(() => ReleaseEntity, (r) => r.artist)
  releases: Relation<ReleaseEntity[]>;

  @OneToMany(() => ContractEntity, (c) => c.artist)
  contracts: Relation<ContractEntity[]>;
}

// ─── Works (obras) ────────────────────────────────────────────────────────────
@Entity('works')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['isrc'])
@Index(['iswc'])
export class WorkEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 500 }) titulo: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) compositor: string | null;
  @Column({ type: 'text', nullable: true }) compositores: string | null;
  @Column({ type: 'text', nullable: true }) co_compositores: string | null;
  @Column({ type: 'text', nullable: true }) detentores: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) editora: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) isrc: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) iswc: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) cod_abramus: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) cod_ecad: string | null;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) genero: string | null;
  @Column({ type: 'varchar', length: 50, default: WorkStatus.PENDENTE }) status: WorkStatus;
  @Column({ type: 'varchar', length: 20, nullable: true }) duracao: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) origem_externa: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) origem_externa_id: string | null;
  @Column({ type: 'timestamp', nullable: true }) origem_externa_sincronizado_em: Date | null;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => ArtistEntity, (a) => a.works, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'artista_id' })
  artist: Relation<ArtistEntity> | null;

  @OneToMany(() => PhonogramEntity, (p) => p.work)
  phonograms: Relation<PhonogramEntity[]>;

  @OneToMany(() => ShareEntity, (s) => s.work)
  shares: Relation<ShareEntity[]>;

  @ManyToMany(() => ReleaseEntity, (r) => r.works)
  releases: Relation<ReleaseEntity[]>;
}

// ─── Phonograms (fonogramas) ───────────────────────────────────────────────────
@Entity('phonograms')
@Index(['tenant_id'])
@Index(['obra_id'])
@Index(['artista_id'])
@Index(['isrc'])
export class PhonogramEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 500 }) titulo: string;
  @Column({ type: 'uuid', nullable: true }) obra_id: string | null;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) isrc: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) duracao: string | null;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: PhonogramStatus.PENDENTE }) status: PhonogramStatus;
  @Column({ type: 'text', nullable: true }) compositores: string | null;
  @Column({ type: 'text', nullable: true }) interpretes: string | null;
  @Column({ type: 'text', nullable: true }) produtores: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) gravadora: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) cod_abramus: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) cod_ecad: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) origem_externa: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) origem_externa_id: string | null;
  @Column({ type: 'timestamp', nullable: true }) origem_externa_sincronizado_em: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  // Artist→Works navigation: Artist → phonograms → PhonogramEntity → work → WorkEntity
  @ManyToOne(() => ArtistEntity, (a) => a.phonograms, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'artista_id' })
  artist: Relation<ArtistEntity> | null;

  @ManyToOne(() => WorkEntity, (w) => w.phonograms, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'obra_id' })
  work: Relation<WorkEntity> | null;
}

// ─── Contracts ────────────────────────────────────────────────────────────────
@Entity('contracts')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['artista_id'])
@Index(['data_fim'])
export class ContractEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 500 }) titulo: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: ContractStatus.RASCUNHO }) status: ContractStatus;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'uuid', nullable: true }) cliente_id: string | null;
  @Column({ type: 'uuid', nullable: true }) lancamento_id: string | null;
  @Column({ type: 'timestamp', nullable: true }) data_inicio: Date | null;
  @Column({ type: 'timestamp', nullable: true }) data_fim: Date | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) valor: string | null;
  @Column({ type: 'boolean', default: false }) exclusivo: boolean;
  @Column({ type: 'text', nullable: true }) observacoes: string | null;
  @Column({ type: 'text', nullable: true }) arquivo_url: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) autentique_doc_id: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) signing_platform: string | null;
  @Column({ type: 'jsonb', default: [] }) versoes: unknown[];
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => ArtistEntity, (a) => a.contracts, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'artista_id' })
  artist: Relation<ArtistEntity> | null;
}

// ─── Contract Templates ───────────────────────────────────────────────────────
@Entity('contract_templates')
@Index(['tenant_id'])
export class ContractTemplateEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 500 }) titulo: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'text' }) conteudo: string;
  @Column({ type: 'jsonb', default: [] }) variaveis: unknown[];
  @Column({ type: 'boolean', default: true }) ativo: boolean;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
}

// ─── Transactions ─────────────────────────────────────────────────────────────
@Entity('transactions')
@Index(['tenant_id'])
@Index(['tenant_id', 'data'])
@Index(['artista_id'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 50 }) tipo: TransactionTipo;
  @Column({ type: 'varchar', length: 100 }) categoria: string;
  @Column({ type: 'text', nullable: true }) descricao: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) valor: string;
  @Column({ type: 'timestamp' }) data: Date;
  @Column({ type: 'varchar', length: 50, default: TransactionStatus.PENDENTE }) status: TransactionStatus;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'uuid', nullable: true }) contrato_id: string | null;
  @Column({ type: 'uuid', nullable: true }) projeto_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) referencia: string | null;
  @Column({ type: 'text', nullable: true }) comprovante_url: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
}

// ─── Invoices (Notas Fiscais) ─────────────────────────────────────────────────
@Entity('invoices')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) numero: string | null;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: InvoiceStatus.PENDENTE }) status: InvoiceStatus;
  @Column({ type: 'uuid', nullable: true }) prestador_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) tomador_nome: string | null;
  @Column({ type: 'text', nullable: true }) tomador_doc_encrypted: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) valor: string;
  @Column({ type: 'text', nullable: true }) descricao: string | null;
  @Column({ type: 'timestamp', nullable: true }) data_emissao: Date | null;
  @Column({ type: 'timestamp', nullable: true }) data_vencimento: Date | null;
  @Column({ type: 'text', nullable: true }) arquivo_url: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
}

// ─── Clients ──────────────────────────────────────────────────────────────────
@Entity('clients')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
export class ClientEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) nome: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) segmento: string | null;
  @Column({ type: 'varchar', length: 50, default: 'pessoa_juridica' }) tipo_pessoa: string;
  @Column({ type: 'text', nullable: true }) cpf_cnpj_encrypted: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) responsavel: string | null;
  @Column({ type: 'text', nullable: true }) email_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) telefone_encrypted: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) endereco: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) cidade: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) estado: string | null;
  @Column({ type: 'varchar', length: 50, default: ClientStatus.ATIVO }) status: ClientStatus;
  @Column({ type: 'text', nullable: true }) observacoes: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
}

// ─── Leads ────────────────────────────────────────────────────────────────────
@Entity('leads')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['cliente_id'])
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) cliente_id: string | null;
  @Column({ type: 'varchar', length: 255 }) nome: string;
  @Column({ type: 'text', nullable: true }) email_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) telefone_encrypted: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) empresa: string | null;
  @Column({ type: 'varchar', length: 50, default: LeadStatus.NOVO }) status: LeadStatus;
  @Column({ type: 'integer', default: 0 }) score: number;
  @Column({ type: 'varchar', length: 100, nullable: true }) fonte: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) pipeline_stage: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @OneToMany(() => LeadInteractionEntity, (i) => i.lead)
  interactions: Relation<LeadInteractionEntity[]>;
}

// ─── Lead Interactions ────────────────────────────────────────────────────────
@Entity('lead_interactions')
@Index(['tenant_id'])
@Index(['lead_id'])
export class LeadInteractionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) lead_id: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'text', nullable: true }) descricao: string | null;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) data: Date;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => LeadEntity, (l) => l.interactions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Relation<LeadEntity>;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
@Entity('campaigns')
@Index(['tenant_id'])
export class CampaignEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) nome: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: CampaignStatus.RASCUNHO }) status: CampaignStatus;
  @Column({ type: 'text', nullable: true }) objetivo: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) orcamento: string | null;
  @Column({ type: 'timestamp', nullable: true }) data_inicio: Date | null;
  @Column({ type: 'timestamp', nullable: true }) data_fim: Date | null;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @OneToMany(() => BriefingEntity, (b) => b.campaign)
  briefings: Relation<BriefingEntity[]>;
}

// ─── Briefings ────────────────────────────────────────────────────────────────
@Entity('briefings')
@Index(['tenant_id'])
export class BriefingEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) titulo: string;
  @Column({ type: 'text', nullable: true }) descricao: string | null;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'uuid', nullable: true }) campanha_id: string | null;
  @Column({ type: 'varchar', length: 50, default: BriefingStatus.RASCUNHO }) status: BriefingStatus;
  @Column({ type: 'timestamp', nullable: true }) prazo: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => CampaignEntity, (c) => c.briefings, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campanha_id' })
  campaign: Relation<CampaignEntity> | null;
}

// ─── Events (Agenda) ──────────────────────────────────────────────────────────
@Entity('events')
@Index(['tenant_id'])
@Index(['tenant_id', 'data'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) titulo: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: EventStatus.AGENDADO }) status: EventStatus;
  @Column({ type: 'timestamp' }) data: Date;
  @Column({ type: 'varchar', length: 255, nullable: true }) local: string | null;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) valor: string | null;
  @Column({ type: 'text', nullable: true }) observacoes: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
@Entity('projects')
@Index(['tenant_id'])
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) nome: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: ProjectStatus.PLANEJAMENTO }) status: ProjectStatus;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'timestamp', nullable: true }) data_inicio: Date | null;
  @Column({ type: 'timestamp', nullable: true }) data_fim: Date | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) orcamento: string | null;
  @Column({ type: 'text', nullable: true }) descricao: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
}

// ─── Releases (Lançamentos) ───────────────────────────────────────────────────
@Entity('releases')
@Index(['tenant_id'])
@Index(['artista_id'])
export class ReleaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'varchar', length: 500 }) titulo: string;
  @Column({ type: 'varchar', length: 100, default: 'single' }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: ReleaseStatus.DRAFT }) status: ReleaseStatus;
  @Column({ type: 'varchar', length: 255, nullable: true }) distribuidora: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) upc: string | null;
  @Column({ type: 'timestamp', nullable: true }) data_lancamento: Date | null;
  @Column({ type: 'jsonb', default: [] }) plataformas: unknown[];
  @Column({ type: 'text', nullable: true }) capa_url: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => ArtistEntity, (a) => a.releases, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'artista_id' })
  artist: Relation<ArtistEntity> | null;

  @ManyToMany(() => WorkEntity, (w) => w.releases)
  @JoinTable({
    name: 'release_works',
    joinColumn:        { name: 'release_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'work_id',    referencedColumnName: 'id' },
  })
  works: Relation<WorkEntity[]>;
}

// ─── Shares (Participações) ───────────────────────────────────────────────────
@Entity('shares')
@Index(['tenant_id'])
@Index(['obra_id'])
export class ShareEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) obra_id: string | null;
  @Column({ type: 'uuid', nullable: true }) fonograma_id: string | null;
  @Column({ type: 'varchar', length: 255 }) titular_nome: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) titular_doc: string | null;
  @Column({ type: 'varchar', length: 100, default: 'autor' }) papel: string;
  @Column({ type: 'decimal', precision: 7, scale: 4 }) percentual: string;
  @Column({ type: 'varchar', length: 50, default: ShareStatus.ATIVO }) status: ShareStatus;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => WorkEntity, (w) => w.shares, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'obra_id' })
  work: Relation<WorkEntity> | null;
}

// ─── Takedowns ────────────────────────────────────────────────────────────────
@Entity('takedowns')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
export class TakedownEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) titulo: string;
  @Column({ type: 'varchar', length: 100 }) plataforma: string;
  @Column({ type: 'text', nullable: true }) url: string | null;
  @Column({ type: 'varchar', length: 50, default: TakedownStatus.PENDENTE }) status: TakedownStatus;
  @Column({ type: 'uuid', nullable: true }) obra_id: string | null;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'text', nullable: true }) motivo: string | null;
  @Column({ type: 'text', nullable: true }) resposta: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
}

// ─── Support Tickets ──────────────────────────────────────────────────────────
@Entity('support_tickets')
@Index(['tenant_id'])
@Index(['status'])
export class SupportTicketEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 50, unique: true }) ticket_number: string;
  @Column({ type: 'varchar', length: 500 }) subject: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, default: SupportTicketStatus.OPEN }) status: SupportTicketStatus;
  @Column({ type: 'varchar', length: 50, default: SupportTicketPriority.MEDIUM }) priority: SupportTicketPriority;
  @Column({ type: 'varchar', length: 100, nullable: true }) category: string | null;
  @Column({ type: 'varchar', length: 255 }) created_by: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) assigned_to: string | null;
  @Column({ type: 'timestamp', nullable: true }) sla_deadline: Date | null;
  @Column({ type: 'timestamp', nullable: true }) resolved_at: Date | null;
  @Column({ type: 'jsonb', default: [] }) tags: unknown[];
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
}

// ─── Notifications ────────────────────────────────────────────────────────────
@Entity('notifications')
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'user_id', 'read_at'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) user_id: string;
  @Column({ type: 'varchar', length: 255 }) title: string;
  @Column({ type: 'text', nullable: true }) body: string | null;
  /** Notification type — pode ser enum genérico (NotificationType) ou event identifier (e.g. 'contract:expiring') */
  @Column({ type: 'varchar', length: 100 }) type: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) entity: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) entity_id: string | null;
  @Column({ type: 'timestamp', nullable: true }) read_at: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
}

// ─── Uploads ──────────────────────────────────────────────────────────────────
@Entity('uploads')
@Index(['tenant_id'])
@Index(['file_id'], { unique: true })
@Index(['entity', 'entity_id'])
export class UploadEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) user_id: string;
  @Column({ type: 'varchar', length: 255, unique: true }) file_id: string;
  @Column({ type: 'varchar', length: 500 }) original_name: string;
  @Column({ type: 'varchar', length: 255 }) mime_type: string;
  @Column({ type: 'integer' }) size_bytes: number;
  @Column({ type: 'text' }) r2_key: string;
  @Column({ type: 'varchar', length: 50 }) category: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) entity: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) entity_id: string | null;
  @Column({ type: 'varchar', length: 50, default: UploadStatus.PENDING }) status: UploadStatus;
  @Column({ type: 'timestamp', nullable: true }) confirmed_at: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
}

// ─── Integrations ─────────────────────────────────────────────────────────────
@Entity('integrations')
@Index(['tenant_id', 'provider'], { unique: true })
export class IntegrationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 100 }) provider: string;
  @Column({ type: 'varchar', length: 50, default: IntegrationStatus.DISCONNECTED }) status: IntegrationStatus;
  @Column({ type: 'text', nullable: true }) credentials_encrypted: string | null;
  @Column({ type: 'jsonb', default: {} }) settings: Record<string, unknown>;
  @Column({ type: 'timestamp', nullable: true }) last_sync_at: Date | null;
  @Column({ type: 'integer', default: 0 }) failure_count: number;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
}

// ─── OAuth Connections ────────────────────────────────────────────────────────
@Entity('oauth_connections')
@Index(['tenant_id', 'user_id', 'provider'], { unique: true })
@Index(['tenant_id'])
export class OAuthConnectionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) user_id: string;
  @Column({ type: 'varchar', length: 100 }) provider: string;
  @Column({ type: 'text' }) access_token_encrypted: string;
  @Column({ type: 'text', nullable: true }) refresh_token_encrypted: string | null;
  @Column({ type: 'timestamp', nullable: true }) expires_at: Date | null;
  @Column({ type: 'text', nullable: true }) scopes: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
}

// ─── Webhook Events ───────────────────────────────────────────────────────────
@Entity('webhook_events')
@Index(['provider', 'event_type'])
@Index(['status'])
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', nullable: true }) tenant_id: string | null;
  @Column({ type: 'varchar', length: 100 }) provider: string;
  @Column({ type: 'varchar', length: 100 }) event_type: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) external_id: string | null;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ type: 'varchar', length: 50, default: WebhookEventStatus.PENDING }) status: WebhookEventStatus;
  @Column({ type: 'timestamp', nullable: true }) processed_at: Date | null;
  @Column({ type: 'text', nullable: true }) error: string | null;
  @Column({ type: 'integer', default: 0 }) retry_count: number;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
/** Append-only — no soft-delete, no update */
@Entity('audit_logs')
@Index(['tenant_id'])
@Index(['tenant_id', 'entity'])
@Index(['tenant_id', 'entity', 'entity_id'])
@Index(['user_id'])
@Index(['created_at'])
@Index(['correlation_id'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** Tenant isolation — mandatory for all non-system events */
  @Column({ type: 'uuid', nullable: true }) tenant_id: string | null;
  /** Organisation owning this tenant (billing boundary) */
  @Column({ type: 'uuid', nullable: true }) org_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) user_id: string | null;
  /** Actor role at the time of the action (OWNER, ADMIN, EDITOR, …) */
  @Column({ type: 'varchar', length: 50, nullable: true }) actor_role: string | null;
  @Column({ type: 'varchar', length: 100 }) action: string;
  @Column({ type: 'varchar', length: 100 }) entity: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) entity_id: string | null;
  /** Snapshot before mutation */
  @Column({ type: 'jsonb', nullable: true }) before: Record<string, unknown> | null;
  /** Snapshot after mutation */
  @Column({ type: 'jsonb', nullable: true }) after: Record<string, unknown> | null;
  /** Only the fields that actually changed (subset of before/after) */
  @Column({ type: 'jsonb', nullable: true }) diff: Record<string, unknown> | null;
  @Column({ type: 'varchar', length: 45, nullable: true }) ip_address: string | null;
  @Column({ type: 'text', nullable: true }) user_agent: string | null;
  /** Matches request_id / X-Request-Id header */
  @Column({ type: 'varchar', length: 255, nullable: true }) request_id: string | null;
  /** From AsyncLocalStorage — links to domain event correlation_id */
  @Column({ type: 'varchar', length: 255, nullable: true }) correlation_id: string | null;
  /** Browser/client session identifier if provided */
  @Column({ type: 'varchar', length: 255, nullable: true }) session_id: string | null;
  /** HTTP method of the originating request */
  @Column({ type: 'varchar', length: 10, nullable: true }) http_method: string | null;
  /** HTTP path of the originating request */
  @Column({ type: 'text', nullable: true }) http_path: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
}

// ─── AI Jobs ──────────────────────────────────────────────────────────────────
@Entity('ai_jobs')
@Index(['tenant_id'])
@Index(['created_at'])
export class AIJobEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) user_id: string;
  @Column({ type: 'varchar', length: 50 }) provider: string;
  @Column({ type: 'varchar', length: 100 }) model: string;
  @Column({ type: 'varchar', length: 100 }) skill: string;
  @Column({ type: 'varchar', length: 50, default: AIJobStatus.PENDING }) status: AIJobStatus;
  @Column({ type: 'integer', default: 0 }) input_tokens: number;
  @Column({ type: 'integer', default: 0 }) output_tokens: number;
  @Column({ type: 'decimal', precision: 12, scale: 8, default: '0' }) cost_usd: string;
  @Column({ type: 'integer', nullable: true }) latency_ms: number | null;
  @Column({ type: 'timestamp', nullable: true }) completed_at: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
}

// ─── Artist Goals ─────────────────────────────────────────────────────────────
@Entity('artist_goals')
@Index(['tenant_id'])
@Index(['artista_id'])
export class ArtistGoalEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) artista_id: string;
  @Column({ type: 'varchar', length: 255 }) titulo: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) meta_valor: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: '0' }) valor_atual: string;
  @Column({ type: 'varchar', length: 50, default: ArtistGoalStatus.EM_ANDAMENTO }) status: ArtistGoalStatus;
  @Column({ type: 'varchar', length: 50, default: 'mensal' }) periodo: string;
  @Column({ type: 'timestamp', nullable: true }) data_inicio: Date | null;
  @Column({ type: 'timestamp', nullable: true }) data_fim: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
}

// ─── Content Detections ───────────────────────────────────────────────────────
@Entity('content_detections')
@Index(['tenant_id'])
@Index(['status'])
export class ContentDetectionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) obra_id: string | null;
  @Column({ type: 'uuid', nullable: true }) artista_id: string | null;
  @Column({ type: 'varchar', length: 100 }) plataforma: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) titulo_detectado: string | null;
  @Column({ type: 'text', nullable: true }) url: string | null;
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) score: string | null;
  @Column({ type: 'varchar', length: 50, default: ContentDetectionStatus.PENDENTE }) status: ContentDetectionStatus;
  @Column({ type: 'varchar', length: 100, default: 'uso_nao_autorizado' }) tipo: string;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) detectado_em: Date;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
}

// ─── ECAD Reports ─────────────────────────────────────────────────────────────
@Entity('ecad_reports')
@Index(['tenant_id'])
@Index(['periodo'])
export class EcadReportEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) obra_id: string | null;
  @Column({ type: 'varchar', length: 20 }) periodo: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) valor_bruto: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) valor_liquido: string | null;
  @Column({ type: 'varchar', length: 50, default: EcadReportStatus.PENDENTE }) status: EcadReportStatus;
  @Column({ type: 'text', nullable: true }) arquivo_url: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
}

// ─── Employees ────────────────────────────────────────────────────────────────
@Entity('employees')
@Index(['tenant_id'])
@Index(['status'])
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) nome: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) cargo: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) departamento: string | null;
  @Column({ type: 'varchar', length: 100, default: 'clt' }) tipo_contrato: string;
  @Column({ type: 'varchar', length: 50, default: EmployeeStatus.ATIVO }) status: EmployeeStatus;
  @Column({ type: 'text', nullable: true }) email_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) telefone_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) cpf_encrypted: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) salario: string | null;
  @Column({ type: 'timestamp', nullable: true }) data_admissao: Date | null;
  @Column({ type: 'timestamp', nullable: true }) data_demissao: Date | null;
  @Column({ type: 'jsonb', default: [] }) documentos: unknown[];
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @OneToMany(() => PayrollEntryEntity, (p) => p.employee)
  payroll_entries: Relation<PayrollEntryEntity[]>;

  @OneToMany(() => LeaveRequestEntity, (l) => l.employee)
  leave_requests: Relation<LeaveRequestEntity[]>;
}

// ─── Payroll Entries ──────────────────────────────────────────────────────────
@Entity('payroll_entries')
@Index(['tenant_id'])
@Index(['employee_id'])
@Index(['employee_id', 'competencia'], { unique: true })
export class PayrollEntryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) employee_id: string;
  @Column({ type: 'varchar', length: 7 }) competencia: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) salario_bruto: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: '0' }) descontos: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) salario_liquido: string;
  @Column({ type: 'varchar', length: 50, default: PayrollStatus.PENDENTE }) status: PayrollStatus;
  @Column({ type: 'text', nullable: true }) arquivo_url: string | null;
  @Column({ type: 'timestamp', nullable: true }) pago_em: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => EmployeeEntity, (e) => e.payroll_entries, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Relation<EmployeeEntity>;
}

// ─── Leave Requests ────────────────────────────────────────────────────────────
@Entity('leave_requests')
@Index(['tenant_id'])
@Index(['employee_id'])
export class LeaveRequestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) employee_id: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 50, default: LeaveRequestStatus.PENDENTE }) status: LeaveRequestStatus;
  @Column({ type: 'timestamp' }) data_inicio: Date;
  @Column({ type: 'timestamp' }) data_fim: Date;
  @Column({ type: 'text', nullable: true }) motivo: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) aprovado_por: string | null;
  @Column({ type: 'text', nullable: true }) documento_url: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamp' }) updated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────
  @ManyToOne(() => EmployeeEntity, (e) => e.leave_requests, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Relation<EmployeeEntity>;
}

// ─── Workflow Transitions (histórico de transições de estado) ─────────────────
@Entity('workflow_transitions')
@Index(['tenant_id', 'entity_type', 'entity_id'])
@Index(['tenant_id'])
export class WorkflowTransitionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 100 }) entity_type: string;
  @Column({ type: 'uuid' }) entity_id: string;
  @Column({ type: 'varchar', length: 100 }) from_status: string;
  @Column({ type: 'varchar', length: 100 }) to_status: string;
  @Column({ type: 'varchar', length: 255 }) actor_id: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) actor_role: string | null;
  @Column({ type: 'text', nullable: true }) reason: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
}

// ─── Domain Event Log (append-only audit of domain events) ───────────────────
/** Append-only — records every domain event emitted in the system. */
@Entity('domain_event_log')
@Index(['tenant_id'])
@Index(['tenant_id', 'event_type'])
@Index(['correlation_id'])
@Index(['occurred_at'])
@Index(['aggregate_type', 'aggregate_id'])
export class DomainEventLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', nullable: true }) tenant_id: string | null;
  @Column({ type: 'varchar', length: 100 }) event_type: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) aggregate_type: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) aggregate_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) actor_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) correlation_id: string | null;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) occurred_at: Date;
  @Column({ type: 'timestamp', nullable: true }) processed_at: Date | null;
  @Column({ type: 'text', nullable: true }) error: string | null;
  @CreateDateColumn({ type: 'timestamp' }) created_at: Date;
}

// ─── Activity Logs ───────────────────────────────────────────────────────────
@Entity('activity_logs')
@Index(['tenant_id'])
@Index(['entity_type', 'entity_id'])
export class ActivityLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  @Column({ type: 'uuid' })
  entity_id: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_name: string | null;

  @Column({ type: 'text', nullable: true })
  user_avatar_url: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

// ─── Conversations ────────────────────────────────────────────────────────────
@Entity('conversations')
@Index(['tenant_id', 'status'])
@Index(['assigned_to'])
@Index(['contact_id'])
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) contact_id: string | null;
  @Column({ type: 'text', default: '' }) subject: string;
  @Column({ type: 'varchar', length: 50, default: 'open' }) status: string;
  @Column({ type: 'varchar', length: 50, default: 'internal' }) channel: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) assigned_to: string | null;
  @Column({ type: 'timestamptz', nullable: true }) last_message_at: Date | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;

  @OneToMany(() => ConversationMessageEntity, (m) => m.conversation)
  messages: Relation<ConversationMessageEntity[]>;

  @OneToMany(() => ConversationNoteEntity, (n) => n.conversation)
  notes: Relation<ConversationNoteEntity[]>;
}

@Entity('conversation_messages')
@Index(['conversation_id', 'created_at'])
@Index(['tenant_id'])
export class ConversationMessageEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) conversation_id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'text', default: '' }) body: string;
  @Column({ type: 'varchar', length: 255 }) sender_id: string;
  @Column({ type: 'varchar', length: 50, default: 'user' }) sender_type: string;
  @Column({ type: 'jsonb', default: [] }) attachments: unknown[];
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;

  @ManyToOne(() => ConversationEntity, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Relation<ConversationEntity>;
}

@Entity('conversation_notes')
@Index(['conversation_id', 'created_at'])
export class ConversationNoteEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) conversation_id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'text', default: '' }) body: string;
  @Column({ type: 'varchar', length: 255 }) author_id: string;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;

  @ManyToOne(() => ConversationEntity, (c) => c.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Relation<ConversationEntity>;
}

// ─── Forms & Submissions ──────────────────────────────────────────────────────
@Entity('forms')
@Index(['tenant_id', 'status'])
export class FormEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 500 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'jsonb', default: [] }) fields: unknown[];
  @Column({ type: 'jsonb', default: {} }) settings: Record<string, unknown>;
  @Column({ type: 'varchar', length: 50, default: 'draft' }) status: string;
  @Column({ type: 'int', default: 0 }) submission_count: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;

  @OneToMany(() => FormSubmissionEntity, (s) => s.form)
  submissions: Relation<FormSubmissionEntity[]>;
}

@Entity('form_submissions')
@Index(['form_id', 'created_at'])
@Index(['tenant_id'])
@Index(['lead_id'])
export class FormSubmissionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) form_id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) lead_id: string | null;
  @Column({ type: 'jsonb', default: {} }) data: Record<string, unknown>;
  @Column({ type: 'text', nullable: true }) origin: string | null;
  @Column({ type: 'text', nullable: true }) ip: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;

  @ManyToOne(() => FormEntity, (f) => f.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Relation<FormEntity>;
}

// ─── CRM Canonical (Phase 7) ──────────────────────────────────────────────────

@Entity('crm_companies')
@Index(['tenant_id'])
@Index(['tenant_id', 'deleted_at'])
export class CrmCompanyEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) industry: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) website: string | null;
  @Column({ type: 'text', nullable: true }) email_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) phone_encrypted: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) state: string | null;
  @Column({ type: 'integer', default: 0 }) contact_count: number;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;

  @OneToMany(() => CrmContactEntity, (c) => c.company)
  contacts: Relation<CrmContactEntity[]>;
}

@Entity('crm_contacts')
@Index(['tenant_id'])
@Index(['tenant_id', 'deleted_at'])
@Index(['tenant_id', 'company_id'])
export class CrmContactEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'text', nullable: true }) email_encrypted: string | null;
  @Column({ type: 'text', nullable: true }) phone_encrypted: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) job_title: string | null;
  @Column({ type: 'uuid', nullable: true }) company_id: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) source: string | null;
  @Column({ type: 'integer', default: 0 }) score: number;
  @Column({ type: 'varchar', length: 50, default: 'active' }) status: string;
  @Column({ type: 'uuid', nullable: true }) lead_id: string | null;
  @Column({ type: 'uuid', nullable: true }) client_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) assigned_to: string | null;
  @Column({ type: 'timestamptz', nullable: true }) last_contacted_at: Date | null;
  @Column({ type: 'jsonb', default: {} }) social_links: Record<string, unknown>;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;

  @ManyToOne(() => CrmCompanyEntity, (c) => c.contacts, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<CrmCompanyEntity> | null;

  @OneToMany(() => CrmContactTagEntity, (t) => t.contact)
  contactTags: Relation<CrmContactTagEntity[]>;

  @OneToMany(() => CrmTaskEntity, (t) => t.contact)
  tasks: Relation<CrmTaskEntity[]>;

  @OneToMany(() => CrmTimelineEventEntity, (e) => e.contact)
  timeline: Relation<CrmTimelineEventEntity[]>;
}

@Entity('crm_tags')
@Index(['tenant_id', 'name'], { unique: true })
export class CrmTagEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 100 }) name: string;
  @Column({ type: 'varchar', length: 50, default: '#6366f1' }) color: string;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;

  @OneToMany(() => CrmContactTagEntity, (ct) => ct.tag)
  contactTags: Relation<CrmContactTagEntity[]>;
}

@Entity('crm_contact_tags')
@Index(['contact_id', 'tag_id'], { unique: true })
@Index(['tenant_id'])
export class CrmContactTagEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) contact_id: string;
  @Column({ type: 'uuid' }) tag_id: string;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;

  @ManyToOne(() => CrmContactEntity, (c) => c.contactTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<CrmContactEntity>;

  @ManyToOne(() => CrmTagEntity, (t) => t.contactTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Relation<CrmTagEntity>;
}

@Entity('crm_tasks')
@Index(['tenant_id', 'contact_id'])
@Index(['tenant_id', 'due_date'])
@Index(['assigned_to'])
export class CrmTaskEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 500 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, default: 'pending' }) status: string;
  @Column({ type: 'varchar', length: 50, default: 'medium' }) priority: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) type: string | null;
  @Column({ type: 'uuid', nullable: true }) contact_id: string | null;
  @Column({ type: 'uuid', nullable: true }) company_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) assigned_to: string | null;
  @Column({ type: 'timestamptz', nullable: true }) due_date: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;

  @ManyToOne(() => CrmContactEntity, (c) => c.tasks, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<CrmContactEntity> | null;
}

@Entity('crm_timeline_events')
@Index(['tenant_id', 'contact_id', 'occurred_at'])
export class CrmTimelineEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) contact_id: string;
  @Column({ type: 'varchar', length: 100 }) event_type: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) summary: string | null;
  @Column({ type: 'jsonb', default: {} }) payload: Record<string, unknown>;
  @Column({ type: 'varchar', length: 255, nullable: true }) actor_id: string | null;
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) occurred_at: Date;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;

  @ManyToOne(() => CrmContactEntity, (c) => c.timeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<CrmContactEntity>;
}

// ─── Music Pipelines (Phase 8) ────────────────────────────────────────────────

@Entity('pipelines')
@Index(['tenant_id'])
export class PipelineEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 100, default: 'sales' }) type: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'boolean', default: true }) is_active: boolean;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;

  @OneToMany(() => PipelineStageEntity, (s) => s.pipeline)
  stages: Relation<PipelineStageEntity[]>;

  @OneToMany(() => PipelineOpportunityEntity, (o) => o.pipeline)
  opportunities: Relation<PipelineOpportunityEntity[]>;
}

@Entity('pipeline_stages')
@Index(['pipeline_id', 'position'])
@Index(['tenant_id'])
export class PipelineStageEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) pipeline_id: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'integer', default: 0 }) position: number;
  @Column({ type: 'varchar', length: 50, default: '#6366f1' }) color: string;
  @Column({ type: 'integer', nullable: true }) sla_days: number | null;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) win_probability: string | null;
  @Column({ type: 'boolean', default: false }) is_terminal: boolean;
  @Column({ type: 'boolean', default: false }) is_won: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;

  @ManyToOne(() => PipelineEntity, (p) => p.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Relation<PipelineEntity>;

  @OneToMany(() => PipelineOpportunityEntity, (o) => o.stage)
  opportunities: Relation<PipelineOpportunityEntity[]>;
}

@Entity('pipeline_opportunities')
@Index(['tenant_id', 'pipeline_id'])
@Index(['tenant_id', 'stage_id'])
@Index(['tenant_id', 'contact_id'])
@Index(['tenant_id', 'deleted_at'])
export class PipelineOpportunityEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) pipeline_id: string;
  @Column({ type: 'uuid', nullable: true }) stage_id: string | null;
  @Column({ type: 'varchar', length: 500 }) title: string;
  @Column({ type: 'uuid', nullable: true }) contact_id: string | null;
  @Column({ type: 'uuid', nullable: true }) company_id: string | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) value: string | null;
  @Column({ type: 'varchar', length: 50, default: 'open' }) status: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) probability: string | null;
  @Column({ type: 'timestamptz', nullable: true }) expected_close_date: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) actual_close_date: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) sla_due_at: Date | null;
  @Column({ type: 'boolean', default: false }) sla_breached: boolean;
  @Column({ type: 'varchar', length: 255, nullable: true }) assigned_to: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'jsonb', default: [] }) stage_history: unknown[];
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;

  @ManyToOne(() => PipelineEntity, (p) => p.opportunities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Relation<PipelineEntity>;

  @ManyToOne(() => PipelineStageEntity, (s) => s.opportunities, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stage_id' })
  stage: Relation<PipelineStageEntity> | null;
}

// ─── Campaign Operations (Phase 11) ───────────────────────────────────────────

@Entity('campaign_tasks')
@Index(['tenant_id', 'campaign_id'])
@Index(['tenant_id', 'due_date'])
@Index(['assigned_to'])
export class CampaignTaskEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) campaign_id: string;
  @Column({ type: 'varchar', length: 500 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, default: 'pending' }) status: string;
  @Column({ type: 'varchar', length: 50, default: 'medium' }) priority: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) assigned_to: string | null;
  @Column({ type: 'timestamptz', nullable: true }) due_date: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;

  @ManyToOne(() => CampaignEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Relation<CampaignEntity>;
}

@Entity('campaign_assets')
@Index(['tenant_id', 'campaign_id'])
export class CampaignAssetEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) campaign_id: string;
  @Column({ type: 'varchar', length: 500 }) name: string;
  @Column({ type: 'varchar', length: 100 }) asset_type: string;
  @Column({ type: 'text' }) file_url: string;
  @Column({ type: 'bigint', nullable: true }) file_size: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) mime_type: string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;

  @ManyToOne(() => CampaignEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Relation<CampaignEntity>;
}

// ─── Analytics & AI Governance (Phase 13) ────────────────────────────────────

@Entity('ai_usage_logs')
@Index(['tenant_id', 'created_at'])
@Index(['tenant_id', 'model'])
@Index(['job_id'])
export class AiUsageLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid', nullable: true }) job_id: string | null;
  @Column({ type: 'varchar', length: 255 }) model: string;
  @Column({ type: 'varchar', length: 100 }) feature: string;
  @Column({ type: 'integer', default: 0 }) tokens_input: number;
  @Column({ type: 'integer', default: 0 }) tokens_output: number;
  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 }) cost_usd: string;
  @Column({ type: 'integer', nullable: true }) latency_ms: number | null;
  @Column({ type: 'varchar', length: 50, default: 'success' }) outcome: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) user_id: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
@Entity('inventory_items')
@Index(['tenant_id', 'categoria'])
@Index(['tenant_id', 'status'])
export class InventoryItemEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) nome: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) categoria: string | null;
  @Column({ type: 'integer', default: 0 }) quantidade: number;
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true }) valor_unitario: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) localizacao: string | null;
  @Column({ type: 'varchar', length: 50, default: 'disponivel' }) status: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) responsavel: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) setor: string | null;
  @Column({ type: 'date', nullable: true }) data_entrada: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) local_compra: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) numero_nota_fiscal: string | null;
  @Column({ type: 'text', nullable: true }) observacoes: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;
}

// ─── Licensing ────────────────────────────────────────────────────────────────
@Entity('licenses')
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'obra_id'])
export class LicenseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 500 }) titulo: string;
  @Column({ type: 'uuid', nullable: true }) obra_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) obra_musical: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) artista: string | null;
  @Column({ type: 'uuid', nullable: true }) cliente_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) cliente: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) projeto: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) tipo: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) tipo_uso: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) midia_destino: string | null;
  @Column({ type: 'varchar', length: 150, nullable: true }) territorio: string | null;
  @Column({ type: 'varchar', length: 50, default: 'pendente' }) status: string;
  @Column({ type: 'date', nullable: true }) data_inicio: string | null;
  @Column({ type: 'date', nullable: true }) data_fim: string | null;
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true }) valor: string | null;
  @Column({ type: 'varchar', length: 10, default: 'BRL' }) moeda: string;
  @Column({ type: 'text', nullable: true }) observacoes: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;
}

// ─── Financial Rules ──────────────────────────────────────────────────────────
@Entity('financial_rules')
@Index(['tenant_id', 'tipo'])
@Index(['tenant_id', 'ativo'])
export class FinancialRuleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) nome: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) categoria: string | null;
  @Column({ type: 'varchar', length: 50, default: 'percentual' }) calculo: string;
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 }) valor: string;
  @Column({ type: 'text', nullable: true }) descricao: string | null;
  @Column({ type: 'boolean', default: true }) ativo: boolean;
  @Column({ type: 'jsonb', default: {} }) condicoes: Record<string, unknown>;
  @Column({ type: 'varchar', length: 255, nullable: true }) created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) updated_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) deleted_at: Date | null;
}

// ─── All entities array (for DataSource registration) ─────────────────────────
export const ALL_ENTITIES = [
  OrganizationEntity,
  TenantEntity,
  OrgMemberEntity,
  BillingSubscriptionEntity,
  ArtistEntity,
  WorkEntity,
  PhonogramEntity,
  ContractEntity,
  ContractTemplateEntity,
  TransactionEntity,
  InvoiceEntity,
  ClientEntity,
  LeadEntity,
  LeadInteractionEntity,
  CampaignEntity,
  BriefingEntity,
  EventEntity,
  ProjectEntity,
  ReleaseEntity,
  ShareEntity,
  TakedownEntity,
  SupportTicketEntity,
  NotificationEntity,
  UploadEntity,
  IntegrationEntity,
  OAuthConnectionEntity,
  WebhookEventEntity,
  AuditLogEntity,
  AIJobEntity,
  ArtistGoalEntity,
  ContentDetectionEntity,
  EcadReportEntity,
  EmployeeEntity,
  PayrollEntryEntity,
  LeaveRequestEntity,
  WorkflowTransitionEntity,
  DomainEventLogEntity,
  ActivityLogEntity,
  ConversationEntity,
  ConversationMessageEntity,
  ConversationNoteEntity,
  FormEntity,
  FormSubmissionEntity,
  // Phase 7: CRM Canonical
  CrmCompanyEntity,
  CrmContactEntity,
  CrmTagEntity,
  CrmContactTagEntity,
  CrmTaskEntity,
  CrmTimelineEventEntity,
  // Phase 8: Music Pipelines
  PipelineEntity,
  PipelineStageEntity,
  PipelineOpportunityEntity,
  // Phase 11: Campaign Operations
  CampaignTaskEntity,
  CampaignAssetEntity,
  // Phase 13: Analytics
  AiUsageLogEntity,
  // Phase 14: Inventory, Licensing, Financial Rules
  InventoryItemEntity,
  LicenseEntity,
  FinancialRuleEntity,
];
