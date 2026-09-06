/**
 * modules/assets/asset-classification.service.ts
 *
 * Asset Classification Skill (real). Classifica o asset central em categorias
 * operacionais (wav, mp3, master, instrumental, guia, cover_art, banner, teaser,
 * reel, story, short, lyric_video, visualizer, videoclipe, document, contrato…)
 * a partir de MIME + nome do arquivo + categoria de upload.
 *
 *   - classifyAndApply(): usado automaticamente pelo Asset Linking ao criar o
 *     asset (método "heuristic"), persistindo type + metadados de classificação.
 *   - review(): revisão MANUAL (método "manual"), executada como skill própria
 *     (skill_runs) com auditoria e log de uso.
 *
 * Infraestrutura interna — invisível ao usuário final.
 */

import { Injectable, Inject, Optional, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { AssetEntity, AssetUsageLogEntity } from '../../database/entities';
import { SkillRunService } from '../../core/skills/skill-run.service';

export interface ClassificationResult {
  assetType: string;
  confidence: number;
  method: 'heuristic' | 'manual';
}

@Injectable()
export class AssetClassificationService {
  private readonly logger = new Logger(AssetClassificationService.name);
  private readonly assets: Repository<AssetEntity> | null = null;
  private readonly usageLogs: Repository<AssetUsageLogEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly skillRuns: SkillRunService,
  ) {
    if (ds) {
      this.assets = ds.getRepository(AssetEntity);
      this.usageLogs = ds.getRepository(AssetUsageLogEntity);
    }
  }

  /** Heurística pura de classificação (sem persistência). */
  static classify(mimeType: string, fileName: string, category?: string | null): ClassificationResult {
    const name = `${fileName ?? ''} ${category ?? ''}`.toLowerCase();
    const mime = (mimeType ?? '').toLowerCase();
    const has = (...keys: string[]) => keys.some((k) => name.includes(k));
    const hit = (assetType: string): ClassificationResult => ({ assetType, confidence: 0.7, method: 'heuristic' });
    const weak = (assetType: string): ClassificationResult => ({ assetType, confidence: 0.4, method: 'heuristic' });

    if (mime.startsWith('audio/')) {
      if (has('master')) return hit('master');
      if (has('instrumental')) return hit('instrumental');
      if (has('guia', 'guide')) return hit('guia');
      if (name.includes('.wav') || mime.includes('wav')) return hit('wav');
      if (name.includes('.mp3') || mime.includes('mpeg')) return hit('mp3');
      return weak('audio');
    }
    if (mime.startsWith('image/')) {
      if (has('cover', 'capa', 'cover_art')) return hit('cover_art');
      if (has('banner')) return hit('banner');
      return weak('image');
    }
    if (mime.startsWith('video/')) {
      if (has('teaser')) return hit('teaser');
      if (has('reel')) return hit('reel');
      if (has('story', 'stories')) return hit('story');
      if (has('short')) return hit('short');
      if (has('lyric')) return hit('lyric_video');
      if (has('visualizer')) return hit('visualizer');
      if (has('clipe', 'videoclipe', 'music_video', 'music video', 'mv')) return hit('videoclipe');
      return weak('video');
    }
    if (mime === 'application/pdf' || name.includes('.pdf')) {
      if (has('contrato', 'contract')) return hit('contrato');
      return weak('document');
    }
    return { assetType: 'unknown', confidence: 0.2, method: 'heuristic' };
  }

  /** Aplica uma classificação ao asset (persistência + log de uso). */
  async applyClassification(
    tenantId: string,
    assetId: string,
    result: ClassificationResult,
    actorId?: string | null,
  ): Promise<void> {
    if (!this.assets) return;
    const asset = await this.assets.findOne({ where: { tenant_id: tenantId, id: assetId } });
    if (!asset) throw new NotFoundException('Asset não encontrado');

    const metadata = {
      ...(asset.metadata ?? {}),
      classification: {
        assetType: result.assetType,
        confidence: result.confidence,
        method: result.method,
        classifiedAt: new Date().toISOString(),
        classifiedBy: actorId ?? null,
      },
    };
    await this.assets.update(
      { id: assetId, tenant_id: tenantId },
      { asset_type: result.assetType, metadata } as never,
    );
    if (this.usageLogs) {
      await this.usageLogs.save(
        this.usageLogs.create({
          tenant_id: tenantId,
          asset_id: assetId,
          action: 'classified',
          actor_id: actorId ?? null,
          metadata: { assetType: result.assetType, confidence: result.confidence, method: result.method },
        }),
      );
    }
  }

  /** Classificação automática (heurística) — usada pelo Asset Linking. */
  async classifyAndApply(
    tenantId: string,
    assetId: string,
    mimeType: string,
    fileName: string,
    category?: string | null,
    actorId?: string | null,
  ): Promise<ClassificationResult> {
    const result = AssetClassificationService.classify(mimeType, fileName, category);
    await this.applyClassification(tenantId, assetId, result, actorId);
    return result;
  }

  /** Revisão MANUAL da classificação — executa como skill com auditoria própria. */
  async review(tenantId: string, assetId: string, assetType: string, actorId: string): Promise<ClassificationResult> {
    return this.skillRuns.run<ClassificationResult>(
      {
        tenantId,
        userId: actorId,
        skillName: 'asset-classification',
        entityType: 'asset',
        entityId: assetId,
        input: { assetId, assetType, mode: 'manual' },
      },
      async (ctx) => {
        const result: ClassificationResult = { assetType, confidence: 1, method: 'manual' };
        await this.applyClassification(tenantId, assetId, result, actorId);
        await ctx.log('info', `Classificação manual aplicada: "${assetType}"`, { assetId });
        return { result, output: result as unknown as Record<string, unknown> };
      },
    );
  }
}
