/**
 * modules/uploads/uploads.module.ts
 *
 * Módulo de uploads presignados via Cloudflare R2.
 * StorageModule é @Global — StorageService injectável sem importar explicitamente.
 * DatabaseModule é @Global — DRIZZLE_DB injectável sem importar explicitamente.
 */

import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
})
export class UploadsModule {}
