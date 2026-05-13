/**
 * queues/queue.module.ts
 *
 * Módulo central de filas BullMQ do Music OS 360.
 *
 * Regista todas as filas e os seus processors.
 * Para adicionar uma nova fila:
 *   1. Adicionar o nome em QUEUE_NAMES (queue.constants.ts)
 *   2. Criar Processor em processors/
 *   3. Criar Producer Service em services/
 *   4. Registar aqui em BullModule.registerQueue() e providers[]
 *   5. Exportar o service para uso nos outros módulos
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { EmailProcessor } from './processors/email.processor';
import { EmailQueueService } from './services/email-queue.service';

@Module({
  imports: [
    // ── Fila: emails ────────────────────────────────────────────────────────
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMAILS,
    }),

    // ── Filas futuras (descomentar quando implementadas) ────────────────────
    // BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.AI_JOBS }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.UPLOADS }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.METRICS }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.WEBHOOKS }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.DISTRIBUTION }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.ANALYTICS }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.ACRCLOUD }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.AUTOMATIONS }),
  ],
  providers: [
    // Processors (consumers que processam os jobs)
    EmailProcessor,

    // Producer services (injectáveis nos outros módulos)
    EmailQueueService,
  ],
  exports: [
    // Exportar os services para uso em qualquer módulo que precise de enfileirar
    EmailQueueService,
  ],
})
export class QueueModule {}
