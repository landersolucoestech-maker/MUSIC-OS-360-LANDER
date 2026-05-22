/**
 * core/adapters/distribution-adapter.types.ts
 *
 * Normalized payload and provider-mapping types for digital distribution.
 * Concrete adapters (DistroKid, TuneCore, Believe, CD Baby, etc.) implement
 * IntegrationAdapter<DistributionProviderConfig, NormalizedDistributionPayload, AdapterResult>.
 * No provider logic here — purely shape definitions.
 */

export interface NormalizedDistributionPayload {
  tenantId:     string;
  artistId:     string;
  contractId:   string | null;
  releaseIds:   string[];
  platforms:    string[];
  providerHint: string | null;
  metadata:     Record<string, unknown>;
}

export interface DistributionProviderMapping {
  providerId:   string;
  displayName:  string;
  queueName:    string;
  supportsLive: boolean;
}

export const KNOWN_DISTRIBUTION_PROVIDERS: ReadonlyArray<Pick<DistributionProviderMapping, 'providerId' | 'displayName'>> = [
  { providerId: 'distrokid',  displayName: 'DistroKid' },
  { providerId: 'tunecore',   displayName: 'TuneCore' },
  { providerId: 'believe',    displayName: 'Believe' },
  { providerId: 'cdbaby',     displayName: 'CD Baby' },
  { providerId: 'orchard',    displayName: 'The Orchard' },
  { providerId: 'amuse',      displayName: 'Amuse' },
  { providerId: 'unitedmasters', displayName: 'UnitedMasters' },
];
