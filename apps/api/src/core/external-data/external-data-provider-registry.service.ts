import { Injectable } from '@nestjs/common';
import { MockDistributorProvider } from './mock-distributor.provider';
import { MockSocietyProvider } from './mock-society.provider';
import {
  DistributorSubmissionPayload,
  ExternalDataExchangeKind,
  ExternalDataExchangeProvider,
  ExternalDataProviderMetadata,
  SocietyDataSubmissionPayload,
} from './external-data.types';

type AnyProvider =
  | ExternalDataExchangeProvider<DistributorSubmissionPayload>
  | ExternalDataExchangeProvider<SocietyDataSubmissionPayload>;

@Injectable()
export class ExternalDataProviderRegistry {
  private readonly providers = new Map<string, AnyProvider>();

  constructor() {
    this.register(new MockDistributorProvider());
    this.register(new MockSocietyProvider());
  }

  register(provider: AnyProvider): void {
    this.providers.set(provider.metadata.providerId, provider);
  }

  list(kind?: ExternalDataExchangeKind): ExternalDataProviderMetadata[] {
    return Array.from(this.providers.values())
      .map((provider) => provider.metadata)
      .filter((metadata) => !kind || metadata.kind === kind);
  }

  getDistributor(providerId = 'mock-distributor'): ExternalDataExchangeProvider<DistributorSubmissionPayload> {
    const provider = this.providers.get(providerId);
    if (!provider || provider.metadata.kind !== 'distributor') {
      throw new Error(`Distributor provider not registered: ${providerId}`);
    }
    return provider as ExternalDataExchangeProvider<DistributorSubmissionPayload>;
  }

  getSociety(providerId = 'mock-society'): ExternalDataExchangeProvider<SocietyDataSubmissionPayload> {
    const provider = this.providers.get(providerId);
    if (!provider || provider.metadata.kind !== 'society') {
      throw new Error(`Society provider not registered: ${providerId}`);
    }
    return provider as ExternalDataExchangeProvider<SocietyDataSubmissionPayload>;
  }

  get(providerId: string): AnyProvider {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`External data provider not registered: ${providerId}`);
    return provider;
  }
}
