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
@Index(['clerk_org_id'])
@Index(['slug'])
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) clerk_org_id: string | null;
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
@Index(['clerk_org_id'])
@Index(['slug'])
@Index(['org_id'])
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) org_id: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) clerk_org_id: string | null;
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
@Index(['tenant_id', 'clerk_user_id'], { unique: true })
@Index(['tenant_id'])
@Index(['clerk_user_id'])
export class OrgMemberEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) org_id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'varchar', length: 255 }) clerk_user_id: string;
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
  @Column({ type: 'varchar', length: 50, default: ReleaseStatus.PLANEJAMENTO }) status: ReleaseStatus;
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
@Index(['user_id'])
@Index(['created_at'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', nullable: true }) tenant_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) user_id: string | null;
  @Column({ type: 'varchar', length: 100 }) action: string;
  @Column({ type: 'varchar', length: 100 }) entity: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) entity_id: string | null;
  @Column({ type: 'jsonb', nullable: true }) before: Record<string, unknown> | null;
  @Column({ type: 'jsonb', nullable: true }) after: Record<string, unknown> | null;
  @Column({ type: 'varchar', length: 45, nullable: true }) ip_address: string | null;
  @Column({ type: 'text', nullable: true }) user_agent: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) request_id: string | null;
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
];
