/**
 * modules/uploads/uploads.controller.ts
 *
 * Upload presignado directo browser→R2.
 * Backend nunca recebe o arquivo — apenas gera URLs e regista metadados.
 *
 * POST /uploads/presign        → URL pré-assinada (PUT) + registo no banco
 * POST /uploads/:fileId/confirm → marca status='confirmed' + emite ASSET_UPLOADED
 * GET  /uploads/:fileId/download → URL temporária de download (GET signed)
 */

import {
  Controller, Post, Get, Param, Body,
  NotFoundException, ServiceUnavailableException, Logger, Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource, Repository } from 'typeorm';

import { DATA_SOURCE }     from '../../database/database.module';
import { UploadEntity }    from '../../database/entities';
import { StorageService }  from '../../storage/storage.service';
import { UploadStatus }    from '@music-os-360/types';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly repo: Repository<UploadEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly storage: StorageService,
    private readonly events: EventsService,
  ) {
    if (ds) this.repo = ds.getRepository(UploadEntity);
  }

  /** Lança 503 se a base de dados não estiver disponível */
  private requireRepo(): Repository<UploadEntity> {
    if (!this.repo) {
      throw new ServiceUnavailableException(
        'Base de dados não configurada — uploads de metadados indisponíveis.',
      );
    }
    return this.repo;
  }

  // ── POST /uploads/presign ────────────────────────────────────────────────────

  @Post('presign')
  @ApiOperation({ summary: 'Obter URL pré-assinada para upload directo ao R2' })
  async presign(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Body()          dto:    PresignUploadDto,
  ) {
    const repo = this.requireRepo();
    const { presignedUrl, key, fileId } = await this.storage.createPresignedUpload({
      tenantId:  tenant.id,
      userId:    user.userId,
      category:  dto.category,
      fileName:  dto.fileName,
      mimeType:  dto.mimeType,
      sizeBytes: dto.sizeBytes,
      entity:    dto.entity,
      entityId:  dto.entityId,
    });

    const entity = repo.create({
      tenant_id:     tenant.id,
      user_id:       user.userId,
      file_id:       fileId,
      original_name: dto.fileName,
      mime_type:     dto.mimeType,
      size_bytes:    dto.sizeBytes,
      r2_key:        key,
      category:      dto.category,
      entity:        dto.entity   ?? null,
      entity_id:     dto.entityId ?? null,
      status:        UploadStatus.PENDING,
    });
    await repo.save(entity);

    this.logger.log(`Presign registado: ${fileId} / tenant ${tenant.id}`);
    return { presignedUrl, key, fileId };
  }

  // ── POST /uploads/:fileId/confirm ────────────────────────────────────────────

  @Post(':fileId/confirm')
  @ApiOperation({ summary: 'Confirmar que upload foi concluído' })
  async confirm(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('fileId') fileId:  string,
  ) {
    const repo = this.requireRepo();
    const row = await repo
      .createQueryBuilder('u')
      .where('u.file_id = :fileId AND u.tenant_id = :tenantId', { fileId, tenantId: tenant.id })
      .getOne();

    if (!row) throw new NotFoundException('Upload não encontrado');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await repo.update({ id: row.id } as any, { status: 'confirmed', confirmed_at: new Date() } as any);
    this.logger.log(`Upload confirmado: ${fileId}`);

    // Emit ASSET_UPLOADED domain event — triggers media processing via UploadEventsHandler
    this.events.emitTyped(DOMAIN_EVENTS.ASSET_UPLOADED, {
      tenantId:      tenant.id,
      userId:        user.userId,
      aggregateType: 'upload',
      aggregateId:   row.id,
      payload: {
        uploadId:   row.id,
        tenantId:   tenant.id,
        entityType: row.entity    ?? 'unknown',
        entityId:   row.entity_id ?? 'unknown',
        fileName:   row.original_name,
        mimeType:   row.mime_type,
        uploadedBy: user.userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    return repo.createQueryBuilder('u').where('u.id = :id', { id: row.id }).getOne();
  }

  // ── GET /uploads/:fileId/download ────────────────────────────────────────────

  @Get(':fileId/download')
  @ApiOperation({ summary: 'Obter URL temporária de download (expira em 1h)' })
  async download(
    @CurrentTenant() tenant: { id: string },
    @Param('fileId') fileId:  string,
  ) {
    const repo = this.requireRepo();
    const row = await repo
      .createQueryBuilder('u')
      .where('u.file_id = :fileId AND u.tenant_id = :tenantId', { fileId, tenantId: tenant.id })
      .getOne();

    if (!row) throw new NotFoundException('Arquivo não encontrado');

    const url = await this.storage.createDownloadUrl(row.r2_key, 3600);
    return { url, expiresIn: 3600 };
  }
}
