/**
 * database/migration-validator.service.ts
 *
 * Serviço NestJS que valida, no boot da aplicação, se existem migrations
 * pendentes. Em produção, o processo termina imediatamente se o schema não
 * estiver sincronizado — prevenindo deploys com schema desactualizado.
 *
 * Injectar no AppModule como provider para activar a verificação.
 */

import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from './database.tokens';

@Injectable()
export class MigrationValidatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationValidatorService.name);

  constructor(
    @Optional() @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.ds) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.error('DB unavailable in production - migration validation cannot run');
        process.exit(1);
      }
      this.logger.warn('DB desactivado — validação de migrations ignorada');
      return;
    }

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    const skipCheck    = this.config.get<string>('SKIP_MIGRATION_CHECK') === 'true';

    if (skipCheck) {
      this.logger.warn('SKIP_MIGRATION_CHECK=true — validação desactivada');
      return;
    }

    try {
      const hasPending = await this.ds.showMigrations();

      if (hasPending) {
        const msg =
          'Existem migrations pendentes. Execute "npm run db:migrate" antes de iniciar a aplicação.';

        if (isProduction) {
          this.logger.error(`[FATAL] ${msg}`);
          // Dar tempo aos logs de flush antes de terminar
          await new Promise(r => setTimeout(r, 200));
          process.exit(1);
        } else {
          this.logger.warn(`[DEV] ${msg}`);
        }
      } else {
        this.logger.log('Schema sincronizado — sem migrations pendentes.');
      }
    } catch (err) {
      // Falha na validação não deve impedir boot em dev
      if (isProduction) {
        this.logger.error('Falha ao verificar migrations:', (err as Error).message);
        process.exit(1);
      } else {
        this.logger.warn('Não foi possível verificar migrations (dev):', (err as Error).message);
      }
    }
  }
}
