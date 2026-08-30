import { Module } from '@nestjs/common';
import { WhatsAppCloudProvider } from './whatsapp-cloud.provider';

/**
 * Extraído de IntegrationsModule para permitir que ConversationsModule injete
 * WhatsAppCloudProvider (envio real de escalonamento — Decision Gate item 14)
 * sem dependência circular: IntegrationsModule já importa ConversationsModule.
 */
@Module({
  providers: [WhatsAppCloudProvider],
  exports:   [WhatsAppCloudProvider],
})
export class WhatsAppModule {}
