import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import {
  ActivityLogEntity,
  ArtistEntity,
  PhonogramEntity,
  ReleaseEntity,
  ShareEntity,
  WebhookEventEntity,
  WorkEntity,
} from '../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../events/events.service';
import { ExternalDataProviderRegistry } from './external-data-provider-registry.service';
import {
  DistributorSubmissionPayload,
  ExternalDataExchangeKind,
  ExternalDataRequestContext,
  ExternalDataSubmissionResult,
  ExternalDataWebhookPayload,
  SocietyDataSubmissionPayload,
} from './external-data.types';
import { WebhookEventStatus } from '@music-os-360/types';

type EntityType = 'artist' | 'release' | 'work' | 'phonogram';

interface SubmitDistributorInput {
  tenantId: string;
  userId: string;
  providerId?: string;
  artistId: string;
  releaseId?: string | null;
  phonogramIds?: string[];
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

interface SubmitSocietyInput {
  tenantId: string;
  userId: string;
  providerId?: string;
  artistId?: string | null;
  workIds?: string[];
  phonogramIds?: string[];
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

interface StatusCheckInput {
  tenantId: string;
  userId: string;
  providerId?: string;
  submissionId: string;
  entityType?: EntityType;
  entityId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class ExternalDataExchangeService {
  private readonly logger = new Logger(ExternalDataExchangeService.name);

  private readonly artists: Repository<ArtistEntity> | null = null;
  private readonly releases: Repository<ReleaseEntity> | null = null;
  private readonly works: Repository<WorkEntity> | null = null;
  private readonly phonograms: Repository<PhonogramEntity> | null = null;
  private readonly shares: Repository<ShareEntity> | null = null;
  private readonly activityLogs: Repository<ActivityLogEntity> | null = null;
  private readonly webhookEvents: Repository<WebhookEventEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly registry: ExternalDataProviderRegistry,
    private readonly events: EventsService,
  ) {
    if (ds) {
      this.artists = ds.getRepository(ArtistEntity);
      this.releases = ds.getRepository(ReleaseEntity);
      this.works = ds.getRepository(WorkEntity);
      this.phonograms = ds.getRepository(PhonogramEntity);
      this.shares = ds.getRepository(ShareEntity);
      this.activityLogs = ds.getRepository(ActivityLogEntity);
      this.webhookEvents = ds.getRepository(WebhookEventEntity);
    }
  }

  listProviders(kind?: ExternalDataExchangeKind) {
    return this.registry.list(kind);
  }

  async requestExternalSync(params: {
    tenantId: string;
    userId: string;
    artistId: string;
    workIds?: string[];
    societyHint?: string | null;
  }) {
    this.assertDb();
    await this.assertArtist(params.tenantId, params.artistId);

    this.events.emitTyped(DOMAIN_EVENTS.EXTERNAL_DATA_SYNC_REQUESTED, {
      tenantId: params.tenantId,
      userId: params.userId,
      aggregateType: 'artist',
      aggregateId: params.artistId,
      payload: {
        tenantId: params.tenantId,
        artistId: params.artistId,
        workIds: params.workIds ?? [],
        societyHint: params.societyHint ?? null,
        requestedAt: new Date().toISOString(),
      },
    });

    await this.logActivity(params.tenantId, params.userId, 'artist', params.artistId, 'external_data.sync_requested', {
      workIds: params.workIds ?? [],
      societyHint: params.societyHint ?? null,
    });

    return {
      tenantId: params.tenantId,
      artistId: params.artistId,
      workIds: params.workIds ?? [],
      societyHint: params.societyHint ?? null,
      requestedAt: new Date().toISOString(),
    };
  }

  async submitDistributor(input: SubmitDistributorInput): Promise<ExternalDataSubmissionResult> {
    this.assertDb();
    if (!input.providerId) throw new BadRequestException('providerId is required to submit to a distributor');
    const providerId = input.providerId;
    const provider = this.registry.getDistributor(providerId);
    const payload = await this.buildDistributorPayload(input, providerId);
    const context = this.context(input.tenantId, input.userId, providerId, input.idempotencyKey);

    this.events.emitTyped(DOMAIN_EVENTS.EXTERNAL_DATA_SYNC_STARTED, {
      tenantId: input.tenantId,
      userId: input.userId,
      aggregateType: 'artist',
      aggregateId: input.artistId,
      payload: {
        tenantId: input.tenantId,
        artistId: input.artistId,
        jobId: context.idempotencyKey,
        society: providerId,
        workIds: [],
        startedAt: new Date().toISOString(),
      },
    });

    try {
      const result = await provider.submit(payload, context);
      await this.persistResult(input.tenantId, input.userId, 'artist', input.artistId, result);
      if (input.releaseId) await this.persistResult(input.tenantId, input.userId, 'release', input.releaseId, result);
      for (const phonogramId of input.phonogramIds ?? []) {
        await this.persistResult(input.tenantId, input.userId, 'phonogram', phonogramId, result);
      }

      this.events.emitTyped(DOMAIN_EVENTS.DISTRIBUTOR_SUBMISSION_CREATED, {
        tenantId: input.tenantId,
        userId: input.userId,
        aggregateType: 'artist',
        aggregateId: input.artistId,
        payload: {
          tenantId: input.tenantId,
          artistId: input.artistId,
          distributor: providerId,
          submissionId: result.submissionId,
          externalId: result.externalReleaseId ?? result.externalArtistId ?? null,
          createdAt: result.lastSyncedAt,
        },
      });

      this.events.emitTyped(DOMAIN_EVENTS.EXTERNAL_DATA_SYNC_COMPLETED, {
        tenantId: input.tenantId,
        userId: input.userId,
        aggregateType: 'artist',
        aggregateId: input.artistId,
        payload: {
          tenantId: input.tenantId,
          artistId: input.artistId,
          jobId: context.idempotencyKey,
          society: providerId,
          completedAt: result.lastSyncedAt,
        },
      });

      return result;
    } catch (err) {
      this.emitFailed(input.tenantId, input.userId, input.artistId, context.idempotencyKey, providerId, err);
      throw err;
    }
  }

  async submitSociety(input: SubmitSocietyInput): Promise<ExternalDataSubmissionResult> {
    this.assertDb();
    if (!input.providerId) throw new BadRequestException('providerId is required to submit to a society');
    const providerId = input.providerId;
    const provider = this.registry.getSociety(providerId);
    const payload = await this.buildSocietyPayload(input, providerId);
    const entityId = input.artistId ?? input.workIds?.[0] ?? input.phonogramIds?.[0];
    if (!entityId) throw new BadRequestException('At least one artist/work/phonogram id is required');
    const context = this.context(input.tenantId, input.userId, providerId, input.idempotencyKey);

    this.events.emitTyped(DOMAIN_EVENTS.EXTERNAL_DATA_SYNC_STARTED, {
      tenantId: input.tenantId,
      userId: input.userId,
      aggregateType: 'artist',
      aggregateId: entityId,
      payload: {
        tenantId: input.tenantId,
        artistId: input.artistId ?? entityId,
        jobId: context.idempotencyKey,
        society: providerId,
        workIds: input.workIds ?? [],
        startedAt: new Date().toISOString(),
      },
    });

    try {
      const result = await provider.submit(payload, context);
      if (input.artistId) await this.persistResult(input.tenantId, input.userId, 'artist', input.artistId, result);
      for (const workId of input.workIds ?? []) await this.persistResult(input.tenantId, input.userId, 'work', workId, result);
      for (const phonogramId of input.phonogramIds ?? []) {
        await this.persistResult(input.tenantId, input.userId, 'phonogram', phonogramId, result);
      }

      this.events.emitTyped(DOMAIN_EVENTS.SOCIETY_SUBMISSION_CREATED, {
        tenantId: input.tenantId,
        userId: input.userId,
        aggregateType: 'work',
        aggregateId: input.workIds?.[0] ?? entityId,
        payload: {
          tenantId: input.tenantId,
          artistId: input.artistId ?? entityId,
          society: providerId,
          submissionId: result.submissionId,
          externalId: result.externalWorkId ?? result.externalPhonogramId ?? null,
          createdAt: result.lastSyncedAt,
        },
      });

      this.events.emitTyped(DOMAIN_EVENTS.EXTERNAL_DATA_SYNC_COMPLETED, {
        tenantId: input.tenantId,
        userId: input.userId,
        aggregateType: 'work',
        aggregateId: input.workIds?.[0] ?? entityId,
        payload: {
          tenantId: input.tenantId,
          artistId: input.artistId ?? entityId,
          jobId: context.idempotencyKey,
          society: providerId,
          completedAt: result.lastSyncedAt,
        },
      });

      return result;
    } catch (err) {
      this.emitFailed(input.tenantId, input.userId, input.artistId ?? entityId, context.idempotencyKey, providerId, err);
      throw err;
    }
  }

  async checkDistributorStatus(input: StatusCheckInput): Promise<ExternalDataSubmissionResult> {
    if (!input.providerId) throw new BadRequestException('providerId is required to check distributor status');
    const providerId = input.providerId;
    const result = await this.registry.getDistributor(providerId)
      .checkStatus(input.submissionId, this.context(input.tenantId, input.userId, providerId, input.idempotencyKey));
    if (input.entityType && input.entityId) await this.persistResult(input.tenantId, input.userId, input.entityType, input.entityId, result);
    this.events.emitTyped(DOMAIN_EVENTS.DISTRIBUTOR_STATUS_UPDATED, {
      tenantId: input.tenantId,
      userId: input.userId,
      aggregateType: input.entityType ?? 'artist',
      aggregateId: input.entityId ?? input.submissionId,
      payload: {
        tenantId: input.tenantId,
        artistId: input.entityId ?? input.submissionId,
        distributor: providerId,
        submissionId: input.submissionId,
        status: result.status,
        externalId: result.externalReleaseId ?? result.externalArtistId ?? null,
        updatedAt: result.lastSyncedAt,
      },
    });
    return result;
  }

  async checkSocietyStatus(input: StatusCheckInput): Promise<ExternalDataSubmissionResult> {
    if (!input.providerId) throw new BadRequestException('providerId is required to check society status');
    const providerId = input.providerId;
    const result = await this.registry.getSociety(providerId)
      .checkStatus(input.submissionId, this.context(input.tenantId, input.userId, providerId, input.idempotencyKey));
    if (input.entityType && input.entityId) await this.persistResult(input.tenantId, input.userId, input.entityType, input.entityId, result);
    this.events.emitTyped(DOMAIN_EVENTS.SOCIETY_STATUS_UPDATED, {
      tenantId: input.tenantId,
      userId: input.userId,
      aggregateType: input.entityType ?? 'work',
      aggregateId: input.entityId ?? input.submissionId,
      payload: {
        tenantId: input.tenantId,
        artistId: input.entityId ?? input.submissionId,
        society: providerId,
        submissionId: input.submissionId,
        status: result.status,
        externalId: result.externalWorkId ?? result.externalPhonogramId ?? null,
        updatedAt: result.lastSyncedAt,
      },
    });
    return result;
  }

  async ingestWebhook(params: {
    tenantId: string;
    providerId: string;
    kind: ExternalDataExchangeKind;
    payload: Record<string, unknown>;
    signature?: string | null;
    secret?: string | null;
  }) {
    this.assertDb();
    this.assertSignature(params.payload, params.signature, params.secret);
    const provider = this.registry.get(params.providerId);
    const normalized = provider.normalizeWebhook(params.payload);
    const externalId = `${params.providerId}:${normalized.providerEventId}`;

    const duplicate = await this.webhookEvents!.findOne({ where: { external_id: externalId } });
    if (duplicate) return { duplicate: true, eventId: duplicate.id };

    const saved = await this.webhookEvents!.save(this.webhookEvents!.create({
      tenant_id: params.tenantId,
      provider: params.providerId,
      event_type: `${params.kind}.status`,
      external_id: externalId,
      payload: this.redactSecrets(params.payload),
      status: WebhookEventStatus.PENDING,
      retry_count: 0,
    }));

    try {
      await this.applyWebhook(params.tenantId, normalized);
      await this.webhookEvents!.update({ id: saved.id } as any, {
        status: WebhookEventStatus.PROCESSED,
        processed_at: new Date(),
      } as any);
      return { duplicate: false, eventId: saved.id, normalized };
    } catch (err) {
      await this.webhookEvents!.update({ id: saved.id } as any, {
        status: WebhookEventStatus.FAILED,
        error: (err as Error).message,
        retry_count: 1,
      } as any);
      throw err;
    }
  }

  private async buildDistributorPayload(input: SubmitDistributorInput, providerId: string): Promise<DistributorSubmissionPayload> {
    const artist = await this.assertArtist(input.tenantId, input.artistId);
    const release = input.releaseId
      ? await this.releases!.findOne({ where: { id: input.releaseId, tenant_id: input.tenantId, deleted_at: null } as any })
      : null;
    const phonograms = input.phonogramIds?.length
      ? await this.phonograms!.createQueryBuilder('p')
        .where('p.tenant_id = :tenantId AND p.id IN (:...ids) AND p.deleted_at IS NULL', { tenantId: input.tenantId, ids: input.phonogramIds })
        .getMany()
      : [];

    return {
      tenantId: input.tenantId,
      providerId,
      artistId: input.artistId,
      releaseId: input.releaseId ?? null,
      phonogramIds: phonograms.map((item) => item.id),
      metadata: {
        ...(input.metadata ?? {}),
        artist: {
          id: artist.id,
          name: artist.nome_artistico,
          genre: artist.genero_musical,
          spotify_url: artist.spotify_url,
          youtube_url: artist.youtube_url,
        },
        release: release ? {
          id: release.id,
          title: release.titulo,
          type: release.tipo,
          status: release.status,
          distributor: release.distribuidora,
          upc: release.upc,
          release_date: release.data_lancamento?.toISOString() ?? null,
          artwork_url: release.capa_url,
          platforms: release.plataformas,
        } : null,
        phonograms: phonograms.map((p) => ({
          id: p.id,
          title: p.titulo,
          isrc: p.isrc,
          duration: p.duracao,
          performers: p.interpretes,
          producers: p.produtores,
        })),
        files: {
          artwork_url: release?.capa_url ?? null,
        },
      },
    };
  }

  private async buildSocietyPayload(input: SubmitSocietyInput, providerId: string): Promise<SocietyDataSubmissionPayload> {
    if (input.artistId) await this.assertArtist(input.tenantId, input.artistId);
    const works = input.workIds?.length
      ? await this.works!.createQueryBuilder('w')
        .where('w.tenant_id = :tenantId AND w.id IN (:...ids) AND w.deleted_at IS NULL', { tenantId: input.tenantId, ids: input.workIds })
        .getMany()
      : [];
    const phonograms = input.phonogramIds?.length
      ? await this.phonograms!.createQueryBuilder('p')
        .where('p.tenant_id = :tenantId AND p.id IN (:...ids) AND p.deleted_at IS NULL', { tenantId: input.tenantId, ids: input.phonogramIds })
        .getMany()
      : [];
    const shares = works.length
      ? await this.shares!.createQueryBuilder('s')
        .where('s.tenant_id = :tenantId AND s.obra_id IN (:...ids) AND s.deleted_at IS NULL', { tenantId: input.tenantId, ids: works.map((w) => w.id) })
        .getMany()
      : [];

    return {
      tenantId: input.tenantId,
      providerId,
      artistId: input.artistId ?? null,
      workIds: works.map((item) => item.id),
      phonogramIds: phonograms.map((item) => item.id),
      metadata: {
        ...(input.metadata ?? {}),
        works: works.map((w) => ({
          id: w.id,
          title: w.titulo,
          isrc: w.isrc,
          iswc: w.iswc,
          composers: w.compositores ?? w.compositor,
          co_composers: w.co_compositores,
          publisher: w.editora,
          holders: w.detentores,
          genre: w.genero,
        })),
        phonograms: phonograms.map((p) => ({
          id: p.id,
          title: p.titulo,
          isrc: p.isrc,
          composers: p.compositores,
          performers: p.interpretes,
          label: p.gravadora,
        })),
        contributors: shares.map((s) => ({
          name: s.titular_nome,
          role: s.papel,
          declared_percentage: s.percentual,
          status: s.status,
        })),
        rightHolders: shares.map((s) => ({
          name: s.titular_nome,
          document: s.titular_doc,
          role: s.papel,
          declared_percentage: s.percentual,
        })),
      },
    };
  }

  private async applyWebhook(tenantId: string, payload: ExternalDataWebhookPayload): Promise<void> {
    if (!payload.entityType || !payload.entityId) {
      await this.logActivity(tenantId, 'system:webhook', 'artist', tenantId, 'external_data.webhook_received', payload.raw);
      return;
    }

    const result: ExternalDataSubmissionResult = {
      providerId: payload.providerId,
      kind: payload.kind,
      submissionId: payload.submissionId ?? payload.providerEventId,
      externalArtistId: payload.externalIds?.['external_artist_id'] ?? null,
      externalReleaseId: payload.externalIds?.['external_release_id'] ?? null,
      externalWorkId: payload.externalIds?.['external_work_id'] ?? null,
      externalPhonogramId: payload.externalIds?.['external_phonogram_id'] ?? null,
      protocol: payload.externalIds?.['protocol'] ?? null,
      status: (payload.status ?? 'processing') as ExternalDataSubmissionResult['status'],
      deliveryStatus: payload.deliveryStatus ?? null,
      registrationStatus: payload.registrationStatus ?? null,
      validationErrors: payload.validationErrors ?? [],
      pendingRequirements: payload.pendingRequirements ?? [],
      providerNotes: payload.providerNotes ?? [],
      providerEventId: payload.providerEventId,
      lastSyncedAt: new Date().toISOString(),
      raw: payload.raw,
    };
    await this.persistResult(tenantId, 'system:webhook', payload.entityType, payload.entityId, result);
  }

  private async persistResult(
    tenantId: string,
    userId: string,
    entityType: EntityType,
    entityId: string,
    result: ExternalDataSubmissionResult,
  ): Promise<void> {
    const repo = this.repoFor(entityType);
    const row = await repo.findOne({ where: { id: entityId, tenant_id: tenantId, deleted_at: null } as any });
    if (!row) throw new BadRequestException(`${entityType} not found in tenant`);
    const metadata = { ...((row as any).metadata ?? {}) };
    const exchange = { ...(metadata['external_data_exchange'] as Record<string, unknown> | undefined ?? {}) };
    exchange[result.providerId] = {
      kind: result.kind,
      submission_id: result.submissionId,
      external_artist_id: result.externalArtistId ?? null,
      external_release_id: result.externalReleaseId ?? null,
      external_work_id: result.externalWorkId ?? null,
      external_phonogram_id: result.externalPhonogramId ?? null,
      protocol: result.protocol ?? null,
      status: result.status,
      delivery_status: result.deliveryStatus ?? null,
      registration_status: result.registrationStatus ?? null,
      validation_errors: result.validationErrors,
      pending_requirements: result.pendingRequirements,
      provider_notes: result.providerNotes,
      provider_event_id: result.providerEventId ?? null,
      last_synced_at: result.lastSyncedAt,
    };
    metadata['external_data_exchange'] = exchange;
    await repo.update({ id: entityId, tenant_id: tenantId } as any, { metadata, updated_at: new Date() } as any);

    await this.logActivity(tenantId, userId, entityType, entityId, `${result.kind}.status_updated`, {
      providerId: result.providerId,
      status: result.status,
      validationErrors: result.validationErrors,
      pendingRequirements: result.pendingRequirements,
    });
  }

  private repoFor(entityType: EntityType): Repository<any> {
    if (entityType === 'artist') return this.artists!;
    if (entityType === 'release') return this.releases!;
    if (entityType === 'work') return this.works!;
    return this.phonograms!;
  }

  private async assertArtist(tenantId: string, artistId: string): Promise<ArtistEntity> {
    const artist = await this.artists!.findOne({ where: { id: artistId, tenant_id: tenantId, deleted_at: null } as any });
    if (!artist) throw new BadRequestException('Artist not found in tenant');
    return artist;
  }

  private context(tenantId: string, userId: string, providerId: string, idempotencyKey?: string): ExternalDataRequestContext {
    return {
      tenantId,
      userId,
      providerId,
      idempotencyKey: idempotencyKey || randomUUID(),
    };
  }

  private emitFailed(tenantId: string, userId: string, artistId: string, jobId: string, providerId: string, err: unknown): void {
    this.events.emitTyped(DOMAIN_EVENTS.EXTERNAL_DATA_SYNC_FAILED, {
      tenantId,
      userId,
      aggregateType: 'artist',
      aggregateId: artistId,
      payload: {
        tenantId,
        artistId,
        jobId,
        society: providerId,
        error: (err as Error).message,
        retryCount: 0,
        failedAt: new Date().toISOString(),
      },
    });
  }

  private async logActivity(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (!this.activityLogs) return;
    await this.activityLogs.save(this.activityLogs.create({
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      description: `External data exchange: ${action}`,
      metadata: this.redactSecrets(metadata),
      user_id: userId,
      user_name: null,
      user_avatar_url: null,
    }));
  }

  private assertSignature(payload: Record<string, unknown>, signature?: string | null, secret?: string | null): void {
    if (!secret) return;
    if (!signature) throw new BadRequestException('Webhook signature missing');
    const raw = JSON.stringify(payload);
    const expected = createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
    const left = Buffer.from(expected, 'hex');
    const right = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private redactSecrets(input: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(input, (key, value) => {
      if (/secret|token|password|authorization|signature/i.test(key)) return '[REDACTED]';
      return value;
    })) as Record<string, unknown>;
  }

  private assertDb(): void {
    if (!this.ds) throw new ServiceUnavailableException('External data exchange persistence unavailable');
  }
}
