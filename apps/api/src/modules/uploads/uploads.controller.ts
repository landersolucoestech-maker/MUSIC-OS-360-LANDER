/**
 * modules/uploads/uploads.controller.ts
 *
 * Upload presignado directo browser→R2.
 * Backend nunca recebe o arquivo — apenas gera URLs e regista metadados.
 *
 * POST /uploads/presign        → URL pré-assinada (PUT) + registo no banco
 * POST /uploads/:fileId/confirm → marca status='confirmed'
 * GET  /uploads/:fileId/download → URL temporária de download (GET signed)
 */

import {
  Controller, Post, Get, Param, Body,
  NotFoundException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB }       from '../../database/database.module';
import * as schema           from '../../database/schema';
import { StorageService }   from '../../storage/storage.service';
import { CurrentTenant }    from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }      from '../../core/decorators/current-user.decorator';
import { PresignUploadDto } from './dto/presign-upload.dto';

type DB = NodePgDatabase<typeof schema>;

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DB,
    private readonly storage: StorageService,
  ) {}

  // ── POST /uploads/presign ────────────────────────────────────────────────────

  @Post('presign')
  @ApiOperation({ summary: 'Obter URL pré-assinada para upload directo ao R2' })
  async presign(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Body()          dto:    PresignUploadDto,
  ) {
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

    await this.db.insert(schema.uploads).values({
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
      status:        'pending',
    });

    this.logger.log(`Presign registado: ${fileId} / tenant ${tenant.id}`);
    return { presignedUrl, key, fileId };
  }

  // ── POST /uploads/:fileId/confirm ────────────────────────────────────────────

  @Post(':fileId/confirm')
  @ApiOperation({ summary: 'Confirmar que upload foi concluído' })
  async confirm(
    @CurrentTenant() tenant: { id: string },
    @Param('fileId') fileId:  string,
  ) {
    const [row] = await this.db
      .select()
      .from(schema.uploads)
      .where(
        and(
          eq(schema.uploads.file_id,   fileId),
          eq(schema.uploads.tenant_id, tenant.id),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Upload não encontrado');

    const [updated] = await this.db
      .update(schema.uploads)
      .set({ status: 'confirmed', confirmed_at: new Date() })
      .where(eq(schema.uploads.id, row.id))
      .returning();

    this.logger.log(`Upload confirmado: ${fileId}`);
    return updated;
  }

  // ── GET /uploads/:fileId/download ────────────────────────────────────────────

  @Get(':fileId/download')
  @ApiOperation({ summary: 'Obter URL temporária de download (expira em 1h)' })
  async download(
    @CurrentTenant() tenant: { id: string },
    @Param('fileId') fileId:  string,
  ) {
    const [row] = await this.db
      .select()
      .from(schema.uploads)
      .where(
        and(
          eq(schema.uploads.file_id,   fileId),
          eq(schema.uploads.tenant_id, tenant.id),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Arquivo não encontrado');

    const url = await this.storage.createDownloadUrl(row.r2_key, 3600);
    return { url, expiresIn: 3600 };
  }
}
