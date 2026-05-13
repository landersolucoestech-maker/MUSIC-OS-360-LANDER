/**
 * queues/queue.module.ts
 *
 * Módulo central de filas BullMQ do Music OS 360.
 * 11 filas registadas. Todos os processors e producer services registados aqui.
 *
 * Para adicionar uma nova fila:
 *   1. Adicionar o nome em QUEUE_NAMES (queue.constants.ts)
 *   2. Criar Processor em processors/
 *   3. Criar Producer Service em services/
 *   4. Registar aqui em BullModule.registerQueue() e providers[]
 *   5. Exportar o service para uso nos outros módulos
 *
 * forwardRef(() => AuthModule) — resolve dependência circular:
 *   QueueModule → AuthModule (ClerkSyncProcessor precisa de ClerkSyncService)
 *   AuthModule → QueueModule (ClerkWebhookController precisa de @InjectQueue)
 */

import { Module, forwardRef } from '@nestjs/common';
import { BullModule }              from '@nestjs/bullmq';
import { QUEUE_NAMES }             from './queue.constants';

// ── Processors ─────────────────────────────────────────────────────────────────
import { EmailProcessor }          from './processors/email.processor';
import { NotificationsProcessor }  from './processors/notifications.processor';
import { AIJobsProcessor }         from './processors/ai-jobs.processor';
import { ClerkSyncProcessor }      from './processors/clerk-sync.processor';

// ── Producer Services ──────────────────────────────────────────────────────────
import { EmailQueueService }        from './services/email-queue.service';
import { NotificationsQueueService } from './services/notifications-queue.service';
import { AIJobsQueueService }       from './services/ai-jobs-queue.service';

// ── Módulos externos (sem circular) ────────────────────────────────────────────
import { CoreModule }  from '../core/core.module';
import { AIModule }    from '../modules/ai/ai.module';
import { AuthModule }  from '../modules/auth/auth.module';

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

    // ── Módulos com serviços necessários nos processors ─────────────────────
    CoreModule,                       // MailService → EmailProcessor
    AIModule,                         // AIService → AIJobsProcessor
    forwardRef(() => AuthModule),     // ClerkSyncService → ClerkSyncProcessor
  ],

  providers: [
    // Processors (consumers que processam os jobs)
    EmailProcessor,
    NotificationsProcessor,
    AIJobsProcessor,
    ClerkSyncProcessor,

    // Producer services (injectáveis nos outros módulos)
    EmailQueueService,
    NotificationsQueueService,
    AIJobsQueueService,
  ],

  exports: [
    BullModule,
    EmailQueueService,
    NotificationsQueueService,
    AIJobsQueueService,
  ],
})
export class QueueModule {}
