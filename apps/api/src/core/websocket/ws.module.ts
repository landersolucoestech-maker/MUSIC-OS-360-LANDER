import { Module, Global } from '@nestjs/common';
import { WsGateway } from './ws.gateway';

/**
 * WsModule — @Global() para que WsGateway seja injectável em qualquer módulo
 * sem precisar de importar WsModule explicitamente.
 *
 * Exporta WsGateway para uso em:
 *   - NotificationsProcessor (emite notification:new)
 *   - ArtistsService, ContractsService, etc. (emitem data:changed)
 */
@Global()
@Module({
  providers: [WsGateway],
  exports:   [WsGateway],
})
export class WsModule {}
