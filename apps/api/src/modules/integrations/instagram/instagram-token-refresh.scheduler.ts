import { Injectable, Logger, OnApplicationBootstrap, Inject, Optional } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { OAuthConnectionEntity } from '../../../database/entities';
import { InstagramService } from './instagram.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_WINDOW_DAYS = 7;
const META_PROVIDERS = ['instagram', 'corp_instagram', 'meta_business', 'meta_ads'];

/**
 * Renova proativamente tokens de longa duração do Meta/Instagram antes de
 * expirarem (~60 dias). Sem isto, a única renovação acontecia sob-demanda em
 * InstagramService.getAccountMetrics() — suficiente para o uso orgânico
 * (acedido com frequência), mas insuficiente para conexões corporativas que
 * podem ficar semanas sem serem acedidas e perder o token silenciosamente.
 */
@Injectable()
export class InstagramTokenRefreshScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(InstagramTokenRefreshScheduler.name);
  private readonly repo: Repository<OAuthConnectionEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly instagram: InstagramService,
  ) {
    if (ds) this.repo = ds.getRepository(OAuthConnectionEntity);
  }

  onApplicationBootstrap(): void {
    if (!this.repo) return;
    // Na Vercel não há processo de longa duração para um setInterval — o
    // Vercel Cron invoca runCheck() via GET /internal/cron/instagram-token-refresh
    // (ver instagram-token-refresh-cron.controller.ts + vercel.json `crons`).
    if (process.env['VERCEL']) return;

    this.runCheck().catch((err: unknown) =>
      this.logger.warn(`InstagramTokenRefreshScheduler initial run failed: ${String(err)}`),
    );
    setInterval(() => {
      this.runCheck().catch((err: unknown) =>
        this.logger.warn(`InstagramTokenRefreshScheduler daily run failed: ${String(err)}`),
      );
    }, DAY_MS);
  }

  async runCheck(): Promise<{ checked: number; refreshed: number; failed: number }> {
    if (!this.repo) return { checked: 0, refreshed: 0, failed: 0 };

    const horizon = new Date(Date.now() + REFRESH_WINDOW_DAYS * DAY_MS);
    const rows = await this.repo
      .createQueryBuilder('o')
      .where('o.provider IN (:...providers)', { providers: META_PROVIDERS })
      .andWhere('o.expires_at IS NOT NULL')
      .andWhere('o.expires_at <= :horizon', { horizon })
      .getMany();

    let refreshed = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const ok = await this.instagram.refreshLongLivedToken(row.tenant_id, row.user_id, row.provider);
        if (ok) refreshed++; else failed++;
      } catch (err) {
        failed++;
        this.logger.warn(`InstagramTokenRefreshScheduler: falha em ${row.tenant_id}/${row.user_id}/${row.provider} — ${String(err)}`);
      }
    }
    this.logger.log(`InstagramTokenRefreshScheduler: ${rows.length} verificados, ${refreshed} renovados, ${failed} falhas`);
    return { checked: rows.length, refreshed, failed };
  }
}
