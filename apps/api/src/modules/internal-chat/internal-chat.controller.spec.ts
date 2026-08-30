import 'reflect-metadata';
import { AUDIT_KEY } from '../../core/interceptors/audit.interceptor';
import { InternalChatController } from './internal-chat.controller';

describe('InternalChatController — audit metadata (regression: private content must never reach the viewer-readable audit log)', () => {
  it('createConversation carries no @Audit metadata (group name is user-authored content)', () => {
    expect(Reflect.getMetadata(AUDIT_KEY, InternalChatController.prototype.createConversation)).toBeUndefined();
  });

  it('sendMessage carries no @Audit metadata (message body is private content)', () => {
    expect(Reflect.getMetadata(AUDIT_KEY, InternalChatController.prototype.sendMessage)).toBeUndefined();
  });
});
