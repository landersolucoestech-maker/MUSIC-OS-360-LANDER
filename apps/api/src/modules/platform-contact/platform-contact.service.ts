/**
 * modules/platform-contact/platform-contact.service.ts
 *
 * Platform Commercial Contact (decisão de produto 2026-08-22): contato
 * institucional/comercial sobre o próprio Music OS 360 — NÃO pertence a
 * nenhum tenant operacional. Encaminha por e-mail via MailService (Resend,
 * já real e existente — core/mail/mail.service.ts) para
 * PLATFORM_CONTACT_RECIPIENT_EMAIL. Nunca cria Support Ticket, conversation
 * do MusicChat, lead ou qualquer registro dentro de um tenant. Não persiste
 * nada — o requisito é apenas encaminhar por e-mail.
 */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService, escapeHtml } from '../../core/mail/mail.service';
import type { PlatformContactDto } from './dto/platform-contact.dto';

@Injectable()
export class PlatformContactService {
  private readonly logger = new Logger(PlatformContactService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: PlatformContactDto): Promise<{ accepted: true }> {
    // Honeypot — mesmo padrão já usado no Artist Public Form
    // (leads.service.ts submitPublicArtistApplication): aceita em silêncio,
    // nunca revela ao bot que foi detectado.
    if (dto.website) {
      return { accepted: true };
    }

    const recipient = this.config.get<string>('PLATFORM_CONTACT_RECIPIENT_EMAIL');
    if (!recipient) {
      this.logger.warn(
        'PlatformContactService: PLATFORM_CONTACT_RECIPIENT_EMAIL não configurado — contato institucional indisponível (pendência operacional)',
      );
      throw new ServiceUnavailableException(
        'Contato institucional temporariamente indisponível. Tente novamente mais tarde.',
      );
    }

    const safeName = escapeHtml(dto.name.trim());
    const safeEmail = escapeHtml(dto.email.trim());
    const safeCompany = dto.company?.trim() ? escapeHtml(dto.company.trim()) : null;
    const safeMessage = escapeHtml(dto.message.trim()).replace(/\n/g, '<br>');

    await this.mail.send({
      to: recipient,
      subject: `Contato comercial — MUSIC OS 360${safeCompany ? ` (${safeCompany})` : ''}`,
      replyTo: dto.email.trim(),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
          <h1 style="color:#1d4ed8">🎵 MUSIC OS 360 — Contato Comercial</h1>
          <p><strong>Nome:</strong> ${safeName}</p>
          <p><strong>E-mail:</strong> ${safeEmail}</p>
          ${safeCompany ? `<p><strong>Empresa:</strong> ${safeCompany}</p>` : ''}
          <p><strong>Mensagem:</strong></p>
          <p style="white-space:pre-wrap">${safeMessage}</p>
        </div>
      `,
      tags: [{ name: 'type', value: 'platform_commercial_contact' }],
    });

    this.logger.log('PlatformContactService: contato institucional encaminhado');
    return { accepted: true };
  }
}
