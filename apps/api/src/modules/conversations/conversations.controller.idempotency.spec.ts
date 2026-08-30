import 'reflect-metadata';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { ConversationsController } from './conversations.controller';
import { IdempotencyInterceptor } from '../../core/interceptors/idempotency.interceptor';

/**
 * PD-1 (2026-08-23): message send + conversation create precisam de proteção real contra
 * duplicação em nível de rede (timeout+retry), não só o guard de UI (isSending em
 * MusicChat.tsx). Confirma que @UseInterceptors(IdempotencyInterceptor) está realmente
 * aplicado aos dois métodos — não basta o decorator existir no arquivo, o metadata do
 * NestJS precisa realmente listar o interceptor no handler certo.
 */
describe('ConversationsController — idempotency wiring (PD-1)', () => {
  it('addMessage (POST :id/messages) has IdempotencyInterceptor attached', () => {
    const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, ConversationsController.prototype.addMessage);
    expect(interceptors).toContain(IdempotencyInterceptor);
  });

  it('create (POST /) has IdempotencyInterceptor attached', () => {
    const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, ConversationsController.prototype.create);
    expect(interceptors).toContain(IdempotencyInterceptor);
  });

  it('listMessages (GET :id/messages) does NOT have it — reads should not be idempotency-gated', () => {
    const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, ConversationsController.prototype.listMessages);
    expect(interceptors ?? []).not.toContain(IdempotencyInterceptor);
  });
});
