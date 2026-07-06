/**
 * core/admin/admin-queues.module.ts
 *
 * Mounts @bull-board/nestjs dashboard at /admin/queues for the 4 known queues.
 * Protected by HTTP basic-auth middleware (ADMIN_QUEUES_USER/PASS) since the
 * bull-board middleware mounts BEFORE the Nest JWT guard pipeline.
 *
 * Production policy:
 *   - ADMIN_QUEUES_USER + ADMIN_QUEUES_PASS must be set; otherwise dashboard is disabled.
 *   - In dev defaults to admin/admin (logged warning).
 */

import { DynamicModule, Module, MiddlewareConsumer, NestModule, Logger } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QUEUE_NAMES } from '../../queues/queue.constants';
import { bullMqAvailable } from '../../queues/queue.module';
import type { Request, Response, NextFunction } from 'express';

const BULL_BOARD_PATH = '/admin/queues';

function basicAuthMiddleware(user: string, pass: string) {
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  return (req: Request, res: Response, next: NextFunction) => {
    const got = req.headers['authorization'];
    if (got !== expected) {
      res.setHeader('WWW-Authenticate', 'Basic realm="MUSIC OS 360 Queues"');
      res.status(401).send('Authentication required');
      return;
    }
    next();
  };
}

@Module({})
export class AdminQueuesModule implements NestModule {
  private static readonly logger = new Logger('AdminQueuesModule');

  static async register(): Promise<DynamicModule> {
    const user = process.env['ADMIN_QUEUES_USER'] ?? 'admin';
    const pass = process.env['ADMIN_QUEUES_PASS'] ?? (process.env['NODE_ENV'] === 'production' ? '' : 'admin');
    const enabled = !!(user && pass);

    if (process.env['NODE_ENV'] === 'production' && (!process.env['ADMIN_QUEUES_USER'] || !process.env['ADMIN_QUEUES_PASS'])) {
      AdminQueuesModule.logger.warn('AdminQueuesModule: ADMIN_QUEUES_USER/PASS missing in production — dashboard disabled');
      return { module: AdminQueuesModule };
    }

    if (!enabled) {
      return { module: AdminQueuesModule };
    }

    // Bull Board só existe quando as filas existem: se o QueueModule caiu em
    // no-op (Redis ausente/inacessível em dev), montar o board quebraria o
    // bootstrap com "Nest could not find BullQueue_<nome>".
    if (!(await bullMqAvailable())) {
      AdminQueuesModule.logger.warn('AdminQueuesModule: BullMQ em modo no-op — dashboard de filas desativado');
      return { module: AdminQueuesModule };
    }

    return {
      module: AdminQueuesModule,
      imports: [
        BullBoardModule.forRoot({
          route: BULL_BOARD_PATH,
          adapter: ExpressAdapter,
        }),
        // Register each queue. BullMQAdapter for BullMQ queues.
        BullBoardModule.forFeature(
          ...[
            QUEUE_NAMES.EMAILS,
            QUEUE_NAMES.NOTIFICATIONS,
            QUEUE_NAMES.AI_JOBS,
            QUEUE_NAMES.STREAMING_SYNC,
          ].map((name) => ({ name, adapter: BullMQAdapter })),
        ),
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    const user = process.env['ADMIN_QUEUES_USER'] ?? 'admin';
    const pass = process.env['ADMIN_QUEUES_PASS'] ?? (process.env['NODE_ENV'] === 'production' ? '' : 'admin');
    if (!user || !pass) return;
    consumer.apply(basicAuthMiddleware(user, pass)).forRoutes(BULL_BOARD_PATH, `${BULL_BOARD_PATH}/(.*)`);
  }
}
