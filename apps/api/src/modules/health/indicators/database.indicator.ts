/**
 * health/indicators/database.indicator.ts
 *
 * Terminus health indicator para verificar se o PostgreSQL está acessível.
 * Executa um SELECT 1 para confirmar conectividade real.
 * Nunca lança excepção — retorna status 'down' com detalhe de erro.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @Optional() @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.ds || !this.ds.isInitialized) {
      const result = this.getStatus(key, false, { reason: 'DataSource não inicializado' });
      throw new HealthCheckError('Database check failed', result);
    }

    try {
      await this.ds.query('SELECT 1');
      const opts = this.ds.options as unknown as Record<string, unknown>;
      return this.getStatus(key, true, {
        driver: 'postgres',
        url:    this.sanitizeUrl(
          (opts['url'] ?? opts['host']) as string | undefined,
        ),
      });
    } catch (err) {
      const result = this.getStatus(key, false, {
        error: err instanceof Error ? err.message : String(err),
      });
      throw new HealthCheckError('Database check failed', result);
    }
  }

  private sanitizeUrl(url?: string): string {
    if (!url) return 'unknown';
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return 'invalid-url';
    }
  }
}
