/**
 * modules/auth/clerk-webhook.controller.ts
 *
 * Endpoint de webhook Clerk — recebe eventos de org/user e encaminha
 * para a fila BullMQ "clerk-sync" (processamento assíncrono com retry).
 * Rota pública (sem autenticação): POST /webhooks/clerk
 * Verificação de assinatura HMAC via svix.
 */

import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { InjectQueue }    from '@nestjs/bullmq';
import { Queue }          from 'bullmq';
import { Webhook }        from 'svix';
import { ConfigService }  from '@nestjs/config';
import { Public }         from '../../core/decorators/public.decorator';
import { QUEUE_NAMES }    from '../../queues/queue.constants';
import type { Request }   from 'express';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAMES.CLERK_SYNC)
    private readonly clerkQueue: Queue,
  ) {}

  @Post()
  @Public()
  async handle(
    @Headers('svix-id')        svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const secret = this.config.get<string>('CLERK_WEBHOOK_SECRET') ?? '';

    let event: Record<string, unknown>;

    if (secret === 'whsec_placeholder' || !secret) {
      this.logger.warn('CLERK_WEBHOOK_SECRET não configurado — aceitando sem verificação (dev)');
      event = (req as Request & { body: Record<string, unknown> }).body;
    } else {
      const wh = new Webhook(secret);
      try {
        const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
        event = wh.verify(rawBody, {
          'svix-id':        svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as Record<string, unknown>;
      } catch (err) {
        this.logger.error(`Assinatura Clerk inválida: ${(err as Error).message}`);
        throw new BadRequestException('Assinatura do webhook Clerk inválida');
      }
    }

    const eventType = String(event['type'] ?? 'unknown');
    this.logger.log(`Clerk webhook recebido: ${eventType} — enfileirando`);

    await this.clerkQueue.add(
      'clerk-event',
      { event },
      {
        jobId:    `clerk:${eventType}:${String(event['id'] ?? Date.now())}`,
        attempts: 3,
        backoff:  { type: 'exponential', delay: 2000 },
      },
    );

    return { received: true };
  }
}
