import { Module, Global } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

/**
 * RealtimeModule — @Global() para que RealtimeService seja injectável em
 * qualquer módulo sem precisar de importar RealtimeModule explicitamente.
 * Substitui o WsModule (Socket.IO) — ver realtime.service.ts para o porquê.
 *
 * Exporta RealtimeService para uso em:
 *   - NotificationsProcessor (emite notification:new)
 *   - BillingService, DunningService (emitem billing:*)
 *   - ConversationsService (emite conversation:*)
 *   - AIJobsProcessor (emite ai:job:completed)
 */
@Global()
@Module({
  providers: [RealtimeService],
  exports:   [RealtimeService],
})
export class RealtimeModule {}
