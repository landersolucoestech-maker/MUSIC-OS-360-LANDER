import { Body, Controller, Get, HttpCode, HttpStatus, Headers, Logger, Post, Query, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../../core/decorators/public.decorator';
import { WhatsAppCloudProvider } from './whatsapp-cloud.provider';
import { WebhookService } from '../webhooks/webhook.service';
import { MusicChatAutomationService } from '../../conversations/musicchat-automation.service';
import type { MusicChatInboundMessageDto } from '../../conversations/dto/musicchat-automation.dto';

interface WhatsAppInboundMessage {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppChangeValue {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: WhatsAppInboundMessage[];
}

/**
 * Webhook Meta para WhatsApp Cloud API. Termina no domínio de conversas já
 * existente do MusicChat (MusicChatAutomationService.handleInboundMessage) —
 * não é um segundo sistema de conversas.
 */
@ApiExcludeController()
@Controller('integrations/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly whatsapp: WhatsAppCloudProvider,
    private readonly webhookSvc: WebhookService,
    private readonly musicChat: MusicChatAutomationService,
  ) {}

  @Public()
  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): void {
    try {
      const echoed = this.whatsapp.verifyWebhookChallenge(mode, token, challenge);
      res.status(HttpStatus.OK).send(echoed);
    } catch (err) {
      this.logger.warn(`[whatsapp/webhook] Verificação rejeitada: ${err instanceof Error ? err.message : String(err)}`);
      res.status(HttpStatus.FORBIDDEN).send('Forbidden');
    }
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : null;
    const appSecret = process.env['META_APP_SECRET'] ?? '';

    if (rawBody && appSecret && signature) {
      const valid = this.webhookSvc.validateHmacSignature({
        rawBody, secret: appSecret, received: signature, algorithm: 'sha256', prefix: 'sha256=',
      });
      if (!valid) {
        this.logger.warn('[whatsapp/webhook] Assinatura X-Hub-Signature-256 inválida — evento ignorado');
        return { received: true };
      }
    }

    if (payload?.object !== 'whatsapp_business_account') {
      // Evento de um objeto que não é WhatsApp (ex.: outro produto Meta no
      // mesmo app) — ignora com segurança, não é um erro.
      return { received: true };
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue; // ex.: statuses (delivery receipts) — fora do escopo desta foundation
        await this.processMessagesChange(change.value as WhatsAppChangeValue);
      }
    }

    return { received: true };
  }

  private async processMessagesChange(value: WhatsAppChangeValue): Promise<void> {
    const phoneNumberId = value.metadata?.phone_number_id;
    const messages = value.messages ?? [];
    if (!phoneNumberId || messages.length === 0) return;

    const tenantId = await this.whatsapp.findTenantByPhoneNumberId(phoneNumberId);
    if (!tenantId) {
      this.logger.warn(`[whatsapp/webhook] Nenhum tenant configurado para phone_number_id=${phoneNumberId} — evento ignorado`);
      return;
    }

    for (const message of messages) {
      if (message.type !== 'text' || !message.text?.body) continue; // foundation: só texto por enquanto

      const ingestResult = await this.webhookSvc.ingest({
        provider: 'whatsapp',
        eventType: 'message',
        externalId: message.id,
        tenantId,
        payload: message as unknown as Record<string, unknown>,
      });
      if (ingestResult.isDuplicate) {
        this.logger.log(`[whatsapp/webhook] Evento duplicado ignorado: externalId=${message.id}`);
        continue;
      }

      const contact = value.contacts?.find((c) => c.wa_id === message.from);
      const dto: MusicChatInboundMessageDto = {
        externalContactId: message.from,
        customerName: contact?.profile?.name ?? message.from,
        channel: 'whatsapp',
        body: message.text.body,
        phone: message.from,
        metadata: { externalMessageId: message.id, provider: 'whatsapp', timestamp: message.timestamp ?? null },
      };

      try {
        await this.musicChat.handleInboundMessage(tenantId, dto);
        await this.webhookSvc.markProcessed(ingestResult.eventId, 'processed');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[whatsapp/webhook] Falha ao processar mensagem ${message.id}: ${msg}`);
        await this.webhookSvc.markProcessed(ingestResult.eventId, 'failed', msg);
      }
    }
  }
}
