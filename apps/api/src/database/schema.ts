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
