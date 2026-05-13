/**
 * queues/queue.module.ts
 *
 * Módulo central de filas BullMQ do Music OS 360.
 * 11 filas registadas.
 *
 * Para adicionar uma nova fila:
 *   1. Adicionar o nome em QUEUE_NAMES (queue.constants.ts)
 *   2. Criar Processor em processors/
 *   3. Criar Producer Service em services/
 *   4. Registar aqui em BullModule.registerQueue() e providers[]
 *   5. Exportar o service para uso nos outros módulos
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES }          from './queue.constants';
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
