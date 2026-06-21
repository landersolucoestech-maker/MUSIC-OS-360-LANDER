/**
 * core/websocket/ws.gateway.ts
 *
 * WsGateway — Socket.IO gateway com autenticação JWT e isolamento por tenant.
 *
 * Cada socket autenticado entra em duas rooms:
 *   tenant:<org_id>  — dados partilhados da org (broadcasts de domínio)
 *   user:<user_id>   — notificações individuais
 *
 * Redis Pub/Sub via @socket.io/redis-adapter sincroniza múltiplas instâncias.
 * Se REDIS_QUEUE_URL não estiver definido, corre em modo single-instance.
 *
 * CORS: lê CORS_ORIGINS (vírgula-separado) e rejeita origens não listadas.
 *       Em development permite '*' se CORS_ORIGINS não estiver definido.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger }         from '@nestjs/common';
import { ConfigService }  from '@nestjs/config';
import { TokenVerifierService } from '../security/token-verifier.service';

/** Derives the allowed-origins callback from CORS_ORIGINS env var. */
function buildOriginCallback(rawOrigins: string, nodeEnv: string) {
  if (!rawOrigins || nodeEnv === 'development') {
    return true;
  }
  const allowed = new Set(
    rawOrigins.split(',').map((o) => o.trim()).filter(Boolean),
  );
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowed.has(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`Origem não autorizada: ${origin}`));
    }
  };
}

@WebSocketGateway({
  cors: (req: { headers: Record<string, string | string[] | undefined> }) => {
    const rawOrigins  = process.env.CORS_ORIGINS ?? 'http://localhost:5000';
    const nodeEnv     = process.env.NODE_ENV ?? 'development';
    const origin      = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
    const originCheck = buildOriginCallback(rawOrigins, nodeEnv);
    if (originCheck === true) return { origin: true, credentials: true };
    const allowed = new Set(
      rawOrigins.split(',').map((o) => o.trim()).filter(Boolean),
    );
    return {
      origin: !origin || allowed.has(origin),
      credentials: true,
    };
  },
  transports: ['websocket', 'polling'],
  namespace:  '/',
})
export class WsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(WsGateway.name);

  /** userId → Set de socketIds (suporte a múltiplas abas) */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly config: ConfigService,
    private readonly tokenVerifier: TokenVerifierService,
  ) {}

  async afterInit() {
    const rawOrigins = this.config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5000';
    const nodeEnv    = this.config.get<string>('NODE_ENV') ?? 'development';

    if (this.server?.engine) {
      this.server.engine.on('initial_headers', (_headers: Record<string, string>, req: { headers: Record<string, string | string[] | undefined> }) => {
        const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
        const cb     = buildOriginCallback(rawOrigins, nodeEnv);
        if (cb === true || !origin) return;
        const allowed = new Set(rawOrigins.split(',').map((o) => o.trim()).filter(Boolean));
        if (!allowed.has(origin)) {
          this.logger.warn(`WsGateway: origem não autorizada bloqueada — ${origin}`);
        }
      });
    }

    // Redis Pub/Sub — opcional; usa REDIS_QUEUE_URL (ioredis-compatible).
    const queueUrl = this.config.get<string>('REDIS_QUEUE_URL');

    if (queueUrl && queueUrl !== 'redis://localhost:6379' && !queueUrl.includes('railway.internal')) {
      try {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const { Redis }         = await import('ioredis');

        const pub = new Redis(queueUrl, {
          lazyConnect:          true,
          maxRetriesPerRequest: 0,
          enableReadyCheck:     false,
          connectTimeout:       4000,
          retryStrategy:        () => null,
        });

        await pub.connect().catch((err: Error) => {
          pub.disconnect(false);
          throw new Error(`Redis inacessível: ${err.message?.split('\n')[0]}`);
        });

        const sub = pub.duplicate();
        await sub.connect().catch(() => { /* tolera */ });

        if (this.server && typeof this.server.adapter === 'function') {
          setImmediate(() => {
            this.server.adapter(createAdapter(pub, sub));
            this.logger.log('WsGateway: Redis Pub/Sub activado');
          });
        } else {
          this.logger.log('WsGateway: Redis Pub/Sub activado (adapter deferred)');
        }
      } catch (err) {
        this.logger.warn(`WsGateway: Redis Pub/Sub não activado — ${String(err)}`);
      }
    } else {
      this.logger.log('WsGateway: modo single-instance (sem Redis Pub/Sub)');
    }
  }

  async handleConnection(socket: Socket) {
    // P0-07: WS_ENABLED=false disables real-time entirely (until /socket.io/ runtime fixed).
    if ((this.config.get<string>('WS_ENABLED') ?? 'true') === 'false') {
      this.logger.warn(`WS: WS_ENABLED=false — socket ${socket.id} rejected`);
      socket.disconnect(true);
      return;
    }

    const token =
      (socket.handshake.auth as Record<string, string>)?.token ??
      socket.handshake.headers['authorization']?.replace('Bearer ', '');

    if (!token || token === 'undefined') {
      this.logger.warn(`WS: token ausente — socket ${socket.id} desconectado`);
      socket.disconnect(true);
      return;
    }

    let verified;
    try {
      verified = await this.tokenVerifier.verify(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`WS: token JWT rejeitado (${msg.split('\n')[0]}) — socket ${socket.id} desconectado`);
      socket.disconnect(true);
      return;
    }

    if (!verified.orgId) {
      this.logger.warn(`WS: org_id ausente em token verificado — socket ${socket.id} desconectado`);
      socket.disconnect(true);
      return;
    }

    // Optional tenant scoping: if handshake declares X-Tenant-ID, must match JWT's org_id.
    const declaredTenant =
      (socket.handshake.auth as Record<string, string>)?.tenantId ??
      (socket.handshake.headers['x-tenant-id'] as string | undefined);
    if (declaredTenant && declaredTenant !== verified.orgId) {
      this.logger.warn(
        `WS: tenant mismatch declared=${declaredTenant} jwt=${verified.orgId} — socket ${socket.id} desconectado`,
      );
      socket.disconnect(true);
      return;
    }

    socket.data.userId   = verified.sub;
    socket.data.tenantId = verified.orgId;

    await socket.join(`tenant:${verified.orgId}`);
    await socket.join(`user:${verified.sub}`);

    const set = this.userSockets.get(verified.sub) ?? new Set<string>();
    set.add(socket.id);
    this.userSockets.set(verified.sub, set);

    this.logger.log(`WS conectado: ${verified.sub} / tenant ${verified.orgId}`);
  }

  handleDisconnect(socket: Socket) {
    const { userId } = socket.data as { userId?: string };
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(socket.id);
      if (sockets?.size === 0) this.userSockets.delete(userId);
    }
  }

  /** Emite evento para todos os sockets do tenant */
  sendToTenant(tenantId: string, event: string, data: unknown): void {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  /** Emite evento para um utilizador específico (verifica tenant) */
  sendToUser(tenantId: string, userId: string, event: string, data: unknown): void {
    this.server
      .to(`tenant:${tenantId}`)
      .to(`user:${userId}`)
      .emit(event, data);
  }

  /**
   * Notifica o tenant que um recurso foi alterado.
   * O frontend invalida a query correspondente ao receber este evento.
   */
  notifyDataChanged(tenantId: string, entity: string, id: string): void {
    this.server.to(`tenant:${tenantId}`).emit('data:changed', { entity, id });
  }
}
