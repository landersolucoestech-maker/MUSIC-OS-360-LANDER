/**
 * modules/uploads/uploads.module.ts
 *
 * Módulo de uploads presignados via Cloudflare R2.
 * StorageModule é @Global — StorageService injectável sem importar explicitamente.
 * DatabaseModule é @Global — DATA_SOURCE injectável sem importar explicitamente.
 */

import { Module } from '@nestjs/common';
import { UploadsController }   from './uploads.controller';
import { UploadEventsHandler } from './handlers/upload-events.handler';

@Module({
  controllers: [UploadsController],
  providers:   [UploadEventsHandler],
})
export class UploadsModule {}
