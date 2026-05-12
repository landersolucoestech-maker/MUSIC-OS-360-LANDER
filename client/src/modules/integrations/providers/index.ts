/**
 * integrations/providers/index.ts
 *
 * Barrel de todos os providers de integração.
 * Exporta as instâncias singleton mock e as classes para extensão.
 */

export { MockAuthProvider,          mockAuthProvider          } from "./mock/mock-auth.provider";
export { MockEmailProvider,         mockEmailProvider         } from "./mock/mock-email.provider";
export { MockStorageProvider,       mockStorageProvider       } from "./mock/mock-storage.provider";
export { MockPaymentsProvider,      mockPaymentsProvider      } from "./mock/mock-payments.provider";
export { MockSigningProvider,       mockSigningProvider       } from "./mock/mock-signing.provider";
export { MockClicksignProvider,    mockClicksignProvider    } from "./mock/mock-clicksign.provider";
export { MockDocuSignProvider,     mockDocuSignProvider     } from "./mock/mock-docusign.provider";
export { MockAnalyticsProvider,     mockAnalyticsProvider     } from "./mock/mock-analytics.provider";
export { MockErrorMonitorProvider,  mockErrorMonitorProvider  } from "./mock/mock-error-monitor.provider";
export {
  MockStreamingProvider,
  MockAdsProvider,
  makeMockStreamingProvider,
  makeMockAdsProvider,
}                                                              from "./mock/mock-streaming.provider";
export {
  MockRightsProvider,
  mockEcadProvider,
  mockUbcProvider,
  mockAbramusProvider,
}                                                              from "./mock/mock-rights.provider";
export { MockChatProvider,          mockChatProvider          } from "./mock/mock-chat.provider";
