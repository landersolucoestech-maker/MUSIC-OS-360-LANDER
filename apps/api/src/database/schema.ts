/**
 * database/schema.ts
 *
 * Schema Drizzle ORM do Music OS 360.
 * Fonte de verdade para todas as tabelas da plataforma.
 *
 * Organização:
 *   - tenants          → multi-tenant base
 *   - users            → utilizadores da plataforma
 *   - artists          → artistas
 *   - catalog_works    → obras musicais
 *   - catalog_tracks   → fonogramas
 *   - contracts        → contratos
 *   - transactions     → transações contabilísticas
 */

import {
  pgTable,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  uuid,
  decimal,
  index,
} from 'drizzle-orm/pg-core';

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 255 }).notNull(),
  slug:        varchar('slug', { length: 100 }).notNull().unique(),
  clerkOrgId:  varchar('clerk_org_id', { length: 255 }).unique(),
  plan:        varchar('plan', { length: 50 }).notNull().default('starter'),
  active:      boolean('active').notNull().default(true),
  settings:    jsonb('settings').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('tenants_slug_idx').on(t.slug),
  index('tenants_clerk_org_idx').on(t.clerkOrgId),
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clerkId:    varchar('clerk_id', { length: 255 }).unique(),
  email:      varchar('email', { length: 255 }).notNull(),
  fullName:   varchar('full_name', { length: 255 }),
  role:       varchar('role', { length: 50 }).notNull().default('user'),
  orgRole:    varchar('org_role', { length: 50 }).default('viewer'),
  isActive:   boolean('is_active').notNull().default(true),
  status:     varchar('status', { length: 50 }).notNull().default('active'),
  avatarUrl:  text('avatar_url'),
  metadata:   jsonb('metadata').default({}),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('users_tenant_idx').on(t.tenantId),
  index('users_email_idx').on(t.email),
  index('users_clerk_idx').on(t.clerkId),
]);

// ─── Artists ──────────────────────────────────────────────────────────────────

export const artists = pgTable('artists', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:       varchar('name', { length: 255 }).notNull(),
  stageName:  varchar('stage_name', { length: 255 }),
  genre:      varchar('genre', { length: 100 }),
  status:     varchar('status', { length: 50 }).notNull().default('active'),
  bio:        text('bio'),
  avatarUrl:  text('avatar_url'),
  socialLinks: jsonb('social_links').default({}),
  metadata:   jsonb('metadata').default({}),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('artists_tenant_idx').on(t.tenantId),
  index('artists_name_idx').on(t.name),
]);

// ─── Catalog Works (Obras) ────────────────────────────────────────────────────

export const catalogWorks = pgTable('catalog_works', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title:      varchar('title', { length: 500 }).notNull(),
  iswc:       varchar('iswc', { length: 20 }),
  genre:      varchar('genre', { length: 100 }),
  year:       integer('year'),
  status:     varchar('status', { length: 50 }).notNull().default('active'),
  authors:    jsonb('authors').default([]),
  shares:     jsonb('shares').default([]),
  metadata:   jsonb('metadata').default({}),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('works_tenant_idx').on(t.tenantId),
  index('works_iswc_idx').on(t.iswc),
]);

// ─── Catalog Tracks (Fonogramas) ──────────────────────────────────────────────

export const catalogTracks = pgTable('catalog_tracks', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workId:     uuid('work_id').references(() => catalogWorks.id, { onDelete: 'set null' }),
  artistId:   uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  title:      varchar('title', { length: 500 }).notNull(),
  isrc:       varchar('isrc', { length: 20 }),
  duration:   integer('duration'),
  fileUrl:    text('file_url'),
  status:     varchar('status', { length: 50 }).notNull().default('active'),
  metadata:   jsonb('metadata').default({}),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('tracks_tenant_idx').on(t.tenantId),
  index('tracks_isrc_idx').on(t.isrc),
  index('tracks_artist_idx').on(t.artistId),
]);

// ─── Contracts ────────────────────────────────────────────────────────────────

export const contracts = pgTable('contracts', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  artistId:   uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  title:      varchar('title', { length: 500 }).notNull(),
  type:       varchar('type', { length: 100 }).notNull(),
  status:     varchar('status', { length: 50 }).notNull().default('draft'),
  value:      decimal('value', { precision: 15, scale: 2 }),
  currency:   varchar('currency', { length: 3 }).default('BRL'),
  startsAt:   timestamp('starts_at'),
  expiresAt:  timestamp('expires_at'),
  signedAt:   timestamp('signed_at'),
  fileUrl:    text('file_url'),
  parties:    jsonb('parties').default([]),
  metadata:   jsonb('metadata').default({}),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('contracts_tenant_idx').on(t.tenantId),
  index('contracts_artist_idx').on(t.artistId),
  index('contracts_status_idx').on(t.status),
  index('contracts_expires_idx').on(t.expiresAt),
]);

// ─── Transactions (Accounting) ────────────────────────────────────────────────

export const transactions = pgTable('transactions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  artistId:     uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  type:         varchar('type', { length: 50 }).notNull(),
  category:     varchar('category', { length: 100 }).notNull(),
  amount:       decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency:     varchar('currency', { length: 3 }).default('BRL'),
  description:  text('description'),
  status:       varchar('status', { length: 50 }).notNull().default('pending'),
  referenceId:  varchar('reference_id', { length: 255 }),
  occurredAt:   timestamp('occurred_at').notNull().defaultNow(),
  metadata:     jsonb('metadata').default({}),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('transactions_tenant_idx').on(t.tenantId),
  index('transactions_artist_idx').on(t.artistId),
  index('transactions_type_idx').on(t.type),
  index('transactions_occurred_idx').on(t.occurredAt),
]);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  userId:     uuid('user_id').references(() => users.id,   { onDelete: 'set null' }),
  action:     varchar('action', { length: 100 }).notNull(),
  entity:     varchar('entity', { length: 100 }).notNull(),
  entityId:   varchar('entity_id', { length: 255 }),
  before:     jsonb('before'),
  after:      jsonb('after'),
  ipAddress:  varchar('ip_address', { length: 45 }),
  userAgent:  text('user_agent'),
  requestId:  varchar('request_id', { length: 255 }),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_tenant_idx').on(t.tenantId),
  index('audit_entity_idx').on(t.entity, t.entityId),
  index('audit_created_idx').on(t.createdAt),
]);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id:       uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:   uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title:    varchar('title', { length: 500 }).notNull(),
  body:     text('body'),
  type:     varchar('type', { length: 100 }).notNull().default('info'),
  entity:   varchar('entity', { length: 100 }),
  entityId: varchar('entity_id', { length: 255 }),
  readAt:   timestamp('read_at'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('notifications_tenant_idx').on(t.tenantId),
  index('notifications_user_idx').on(t.userId),
  index('notifications_read_idx').on(t.readAt),
  index('notifications_created_idx').on(t.createdAt),
]);

// ─── Contract Templates ───────────────────────────────────────────────────────

export const contractTemplates = pgTable('contract_templates', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 500 }).notNull(),
  type:        varchar('type', { length: 100 }).notNull(),
  status:      varchar('status', { length: 50 }).notNull().default('active'),
  content:     text('content'),
  variables:   jsonb('variables').default([]),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('ctpl_tenant_idx').on(t.tenantId),
  index('ctpl_type_idx').on(t.type),
]);

// ─── Invoices (Notas Fiscais) ─────────────────────────────────────────────────

export const invoices = pgTable('invoices', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  artistId:     uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  number:       varchar('number', { length: 100 }),
  type:         varchar('type', { length: 100 }).notNull(),
  status:       varchar('status', { length: 50 }).notNull().default('pending'),
  amount:       decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency:     varchar('currency', { length: 3 }).default('BRL'),
  issuerName:   varchar('issuer_name', { length: 255 }),
  issuerDoc:    varchar('issuer_doc', { length: 50 }),
  recipientName: varchar('recipient_name', { length: 255 }),
  recipientDoc:  varchar('recipient_doc', { length: 50 }),
  issuedAt:     timestamp('issued_at'),
  dueAt:        timestamp('due_at'),
  r2Key:        text('r2_key'),
  metadata:     jsonb('metadata').default({}),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('invoices_tenant_idx').on(t.tenantId),
  index('invoices_artist_idx').on(t.artistId),
  index('invoices_status_idx').on(t.status),
  index('invoices_issued_idx').on(t.issuedAt),
]);

// ─── Clients (CRM) ────────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 255 }).notNull(),
  type:        varchar('type', { length: 100 }).notNull().default('person'),
  category:    varchar('category', { length: 100 }),
  email:       varchar('email', { length: 255 }),
  phone:       varchar('phone', { length: 50 }),
  document:    varchar('document', { length: 50 }),
  status:      varchar('status', { length: 50 }).notNull().default('active'),
  avatarUrl:   text('avatar_url'),
  address:     jsonb('address').default({}),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('clients_tenant_idx').on(t.tenantId),
  index('clients_name_idx').on(t.name),
  index('clients_status_idx').on(t.status),
]);

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = pgTable('leads', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 255 }).notNull(),
  email:       varchar('email', { length: 255 }),
  phone:       varchar('phone', { length: 50 }),
  source:      varchar('source', { length: 100 }),
  status:      varchar('status', { length: 50 }).notNull().default('new'),
  stage:       varchar('stage', { length: 100 }).notNull().default('prospect'),
  value:       decimal('value', { precision: 15, scale: 2 }),
  assignedTo:  varchar('assigned_to', { length: 255 }),
  notes:       text('notes'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('leads_tenant_idx').on(t.tenantId),
  index('leads_status_idx').on(t.status),
  index('leads_stage_idx').on(t.stage),
]);

// ─── Lead Interactions ────────────────────────────────────────────────────────

export const leadInteractions = pgTable('lead_interactions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadId:    uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  userId:    varchar('user_id', { length: 255 }).notNull(),
  type:      varchar('type', { length: 100 }).notNull(),
  notes:     text('notes'),
  metadata:  jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('lead_int_tenant_idx').on(t.tenantId),
  index('lead_int_lead_idx').on(t.leadId),
]);

// ─── Campaigns (Marketing) ────────────────────────────────────────────────────

export const campaigns = pgTable('campaigns', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  artistId:    uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  title:       varchar('title', { length: 500 }).notNull(),
  type:        varchar('type', { length: 100 }).notNull(),
  status:      varchar('status', { length: 50 }).notNull().default('draft'),
  budget:      decimal('budget', { precision: 15, scale: 2 }),
  currency:    varchar('currency', { length: 3 }).default('BRL'),
  startsAt:    timestamp('starts_at'),
  endsAt:      timestamp('ends_at'),
  platforms:   jsonb('platforms').default([]),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('campaigns_tenant_idx').on(t.tenantId),
  index('campaigns_artist_idx').on(t.artistId),
  index('campaigns_status_idx').on(t.status),
]);

// ─── Briefings (Marketing) ────────────────────────────────────────────────────

export const briefings = pgTable('briefings', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  campaignId:  uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  title:       varchar('title', { length: 500 }).notNull(),
  status:      varchar('status', { length: 50 }).notNull().default('draft'),
  content:     text('content'),
  objectives:  jsonb('objectives').default([]),
  dueAt:       timestamp('due_at'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('briefings_tenant_idx').on(t.tenantId),
  index('briefings_campaign_idx').on(t.campaignId),
]);

// ─── Events ───────────────────────────────────────────────────────────────────

export const events = pgTable('events', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  artistId:    uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  title:       varchar('title', { length: 500 }).notNull(),
  type:        varchar('type', { length: 100 }).notNull().default('show'),
  status:      varchar('status', { length: 50 }).notNull().default('scheduled'),
  venue:       varchar('venue', { length: 500 }),
  city:        varchar('city', { length: 255 }),
  country:     varchar('country', { length: 100 }).default('BR'),
  startsAt:    timestamp('starts_at'),
  endsAt:      timestamp('ends_at'),
  capacity:    integer('capacity'),
  ticketUrl:   text('ticket_url'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('events_tenant_idx').on(t.tenantId),
  index('events_artist_idx').on(t.artistId),
  index('events_status_idx').on(t.status),
  index('events_starts_idx').on(t.startsAt),
]);

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  artistId:    uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  title:       varchar('title', { length: 500 }).notNull(),
  type:        varchar('type', { length: 100 }).notNull().default('album'),
  status:      varchar('status', { length: 50 }).notNull().default('planning'),
  budget:      decimal('budget', { precision: 15, scale: 2 }),
  currency:    varchar('currency', { length: 3 }).default('BRL'),
  startsAt:    timestamp('starts_at'),
  deadlineAt:  timestamp('deadline_at'),
  releasedAt:  timestamp('released_at'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('projects_tenant_idx').on(t.tenantId),
  index('projects_artist_idx').on(t.artistId),
  index('projects_status_idx').on(t.status),
]);

// ─── Takedowns ────────────────────────────────────────────────────────────────

export const takedowns = pgTable('takedowns', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  trackId:     uuid('track_id').references(() => catalogTracks.id, { onDelete: 'set null' }),
  platform:    varchar('platform', { length: 100 }).notNull(),
  reason:      varchar('reason', { length: 500 }),
  status:      varchar('status', { length: 50 }).notNull().default('pending'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  resolvedAt:  timestamp('resolved_at'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('takedowns_tenant_idx').on(t.tenantId),
  index('takedowns_track_idx').on(t.trackId),
  index('takedowns_status_idx').on(t.status),
]);

// ─── Shares (Royalty shares / participações) ──────────────────────────────────

export const shares = pgTable('shares', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workId:      uuid('work_id').references(() => catalogWorks.id, { onDelete: 'cascade' }),
  trackId:     uuid('track_id').references(() => catalogTracks.id, { onDelete: 'set null' }),
  holderName:  varchar('holder_name', { length: 255 }).notNull(),
  holderDoc:   varchar('holder_doc', { length: 50 }),
  role:        varchar('role', { length: 100 }).notNull().default('author'),
  percentage:  decimal('percentage', { precision: 7, scale: 4 }).notNull(),
  status:      varchar('status', { length: 50 }).notNull().default('active'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('shares_tenant_idx').on(t.tenantId),
  index('shares_work_idx').on(t.workId),
  index('shares_track_idx').on(t.trackId),
]);

// ─── Releases (Lançamentos) ───────────────────────────────────────────────────

export const releases = pgTable('releases', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  artistId:     uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
  title:        varchar('title', { length: 500 }).notNull(),
  type:         varchar('type', { length: 100 }).notNull().default('single'),
  status:       varchar('status', { length: 50 }).notNull().default('planning'),
  distributor:  varchar('distributor', { length: 255 }),
  upc:          varchar('upc', { length: 20 }),
  releasedAt:   timestamp('released_at'),
  platforms:    jsonb('platforms').default([]),
  coverUrl:     text('cover_url'),
  metadata:     jsonb('metadata').default({}),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('releases_tenant_idx').on(t.tenantId),
  index('releases_artist_idx').on(t.artistId),
  index('releases_status_idx').on(t.status),
  index('releases_upc_idx').on(t.upc),
]);

// ─── Support Tickets ──────────────────────────────────────────────────────────

export const supportTickets = pgTable('support_tickets', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:      varchar('user_id', { length: 255 }).notNull(),
  title:       varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status:      varchar('status', { length: 50 }).notNull().default('open'),
  priority:    varchar('priority', { length: 50 }).notNull().default('medium'),
  category:    varchar('category', { length: 100 }),
  resolvedAt:  timestamp('resolved_at'),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('support_tenant_idx').on(t.tenantId),
  index('support_status_idx').on(t.status),
  index('support_priority_idx').on(t.priority),
]);

// ─── Uploads ──────────────────────────────────────────────────────────────────

export const uploads = pgTable('uploads', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:       varchar('user_id', { length: 255 }).notNull(),
  fileId:       varchar('file_id', { length: 255 }).notNull().unique(),
  originalName: varchar('original_name', { length: 500 }).notNull(),
  mimeType:     varchar('mime_type', { length: 255 }).notNull(),
  sizeBytes:    integer('size_bytes').notNull(),
  r2Key:        text('r2_key').notNull(),
  category:     varchar('category', { length: 50 }).notNull(),
  entity:       varchar('entity', { length: 100 }),
  entityId:     varchar('entity_id', { length: 255 }),
  status:       varchar('status', { length: 50 }).notNull().default('pending'),
  confirmedAt:  timestamp('confirmed_at'),
  metadata:     jsonb('metadata').default({}),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('uploads_tenant_idx').on(t.tenantId),
  index('uploads_file_id_idx').on(t.fileId),
  index('uploads_entity_idx').on(t.entity, t.entityId),
  index('uploads_status_idx').on(t.status),
]);

// ─── Exports ──────────────────────────────────────────────────────────────────

export type Tenant       = typeof tenants.$inferSelect;
export type NewTenant    = typeof tenants.$inferInsert;
export type User         = typeof users.$inferSelect;
export type NewUser      = typeof users.$inferInsert;
export type Artist       = typeof artists.$inferSelect;
export type NewArtist    = typeof artists.$inferInsert;
export type CatalogWork  = typeof catalogWorks.$inferSelect;
export type NewCatalogWork = typeof catalogWorks.$inferInsert;
export type CatalogTrack = typeof catalogTracks.$inferSelect;
export type NewCatalogTrack = typeof catalogTracks.$inferInsert;
export type Contract     = typeof contracts.$inferSelect;
export type NewContract  = typeof contracts.$inferInsert;
export type Transaction  = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type AuditLog         = typeof auditLogs.$inferSelect;
export type NewAuditLog      = typeof auditLogs.$inferInsert;
export type Notification     = typeof notifications.$inferSelect;
export type NewNotification  = typeof notifications.$inferInsert;
export type Upload              = typeof uploads.$inferSelect;
export type NewUpload           = typeof uploads.$inferInsert;
export type ContractTemplate    = typeof contractTemplates.$inferSelect;
export type NewContractTemplate = typeof contractTemplates.$inferInsert;
export type Invoice             = typeof invoices.$inferSelect;
export type NewInvoice          = typeof invoices.$inferInsert;
export type Client              = typeof clients.$inferSelect;
export type NewClient           = typeof clients.$inferInsert;
export type Lead                = typeof leads.$inferSelect;
export type NewLead             = typeof leads.$inferInsert;
export type LeadInteraction     = typeof leadInteractions.$inferSelect;
export type NewLeadInteraction  = typeof leadInteractions.$inferInsert;
export type Campaign            = typeof campaigns.$inferSelect;
export type NewCampaign         = typeof campaigns.$inferInsert;
export type Briefing            = typeof briefings.$inferSelect;
export type NewBriefing         = typeof briefings.$inferInsert;
export type Event               = typeof events.$inferSelect;
export type NewEvent            = typeof events.$inferInsert;
export type Project             = typeof projects.$inferSelect;
export type NewProject          = typeof projects.$inferInsert;
export type Takedown            = typeof takedowns.$inferSelect;
export type NewTakedown         = typeof takedowns.$inferInsert;
export type Share               = typeof shares.$inferSelect;
export type NewShare            = typeof shares.$inferInsert;
export type Release             = typeof releases.$inferSelect;
export type NewRelease          = typeof releases.$inferInsert;
export type SupportTicket       = typeof supportTickets.$inferSelect;
export type NewSupportTicket    = typeof supportTickets.$inferInsert;
