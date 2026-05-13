/**
 * modules/auth/clerk-webhook.controller.ts
 *
 * Endpoint de webhook Clerk — recebe eventos de org/user e sincroniza no banco.
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
import { Webhook } from 'svix';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../core/decorators/public.decorator';
import { ClerkSyncService } from './clerk-sync.service';
import type { Request } from 'express';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly clerkSync: ClerkSyncService,
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

    if (secret === 'whsec_placeholder') {
      this.logger.warn('CLERK_WEBHOOK_SECRET não configurado — aceitando sem verificação (dev)');
      const body = (req as Request & { body: Record<string, unknown> }).body;
      await this.clerkSync.process(body as Record<string, unknown>);
      return { received: true };
    }

    const wh = new Webhook(secret);
    let event: Record<string, unknown>;

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

    this.logger.log(`Clerk webhook recebido: ${String(event['type'])}`);
    await this.clerkSync.process(event);

    return { received: true };
  }
}
