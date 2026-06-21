/**
 * modules/assets/assets.module.ts
 *
 * Módulo do modelo central de assets + Asset Linking Skill.
 * DatabaseModule / DomainEventsModule / SkillsModule são @Global — DATA_SOURCE,
 * EventsService e SkillRunService são injetáveis sem import explícito.
 */

import { Module } from '@nestjs/common';
import { AssetLinkingService } from './asset-linking.service';
import { AssetClassificationService } from './asset-classification.service';
import { ReleaseReadinessService } from './release-readiness.service';
import { AssetLinkingHandler } from './handlers/asset-linking.handler';
import { AssetsController } from './assets.controller';

@Module({
  controllers: [AssetsController],
  providers: [AssetLinkingService, AssetClassificationService, ReleaseReadinessService, AssetLinkingHandler],
  exports: [AssetLinkingService, AssetClassificationService, ReleaseReadinessService],
})
export class AssetsModule {}
