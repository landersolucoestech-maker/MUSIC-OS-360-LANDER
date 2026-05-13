/**
 * queues/queue.module.ts
 *
 * Módulo central de filas BullMQ do Music OS 360.
 * 11 filas registadas + Bull Board UI de monitoramento em /bull.
 *
 * Para adicionar uma nova fila:
 *   1. Adicionar o nome em QUEUE_NAMES (queue.constants.ts)
 *   2. Criar Processor em processors/
 *   3. Criar Producer Service em services/
 *   4. Registar aqui em BullModule.registerQueue() e providers[]
 *   5. Exportar o service para uso nos outros módulos
 */

import { Module } from '@nestjs/common';
import { BullModule }      from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter }   from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter }  from '@bull-board/express';
import { QUEUE_NAMES }     from './queue.constants';
import { EmailProcessor }       from './processors/email.processor';
import { EmailQueueService }    from './services/email-queue.service';

@Module({
  imports: [
    // ── Registar todas as 11 filas ──────────────────────────────────────────
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAILS },
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.AI_JOBS },
      { name: QUEUE_NAMES.INTEGRATIONS_SYNC },
      { name: QUEUE_NAMES.STREAMING_SYNC },
      { name: QUEUE_NAMES.WEBHOOKS },
      { name: QUEUE_NAMES.EXPORTS },
      { name: QUEUE_NAMES.IMPORTS },
      { name: QUEUE_NAMES.CLERK_SYNC },
      { name: QUEUE_NAMES.BILLING },
      { name: QUEUE_NAMES.UPLOADS_PROCESS },
    ),

    // ── Bull Board UI — http://localhost:3001/bull ───────────────────────────
    BullBoardModule.forRoot({
      route:   '/bull',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: QUEUE_NAMES.EMAILS,            adapter: BullMQAdapter },
      { name: QUEUE_NAMES.NOTIFICATIONS,     adapter: BullMQAdapter },
      { name: QUEUE_NAMES.AI_JOBS,           adapter: BullMQAdapter },
      { name: QUEUE_NAMES.INTEGRATIONS_SYNC, adapter: BullMQAdapter },
      { name: QUEUE_NAMES.STREAMING_SYNC,    adapter: BullMQAdapter },
      { name: QUEUE_NAMES.WEBHOOKS,          adapter: BullMQAdapter },
      { name: QUEUE_NAMES.EXPORTS,           adapter: BullMQAdapter },
      { name: QUEUE_NAMES.IMPORTS,           adapter: BullMQAdapter },
      { name: QUEUE_NAMES.CLERK_SYNC,        adapter: BullMQAdapter },
      { name: QUEUE_NAMES.BILLING,           adapter: BullMQAdapter },
      { name: QUEUE_NAMES.UPLOADS_PROCESS,   adapter: BullMQAdapter },
    ),
  ],
  providers: [
    // Processors (consumers que processam os jobs)
    EmailProcessor,

    // Producer services (injectáveis nos outros módulos)
    EmailQueueService,
  ],
  exports: [
    BullModule,
    EmailQueueService,
  ],
})
export class QueueModule {}
