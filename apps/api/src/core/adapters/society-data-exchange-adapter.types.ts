/**
 * core/adapters/society-data-exchange-adapter.types.ts
 *
 * Society integrations are data exchange only. MUSIC OS 360 does not calculate royalties.
 * Concrete adapters (UBC, Abramus, Sicam, ECAD, etc.) exchange registration/status data
 * with external systems and store external IDs, protocols, pending requirements, and errors.
 */

export interface RightsRegistrationPayload {
  tenantId:    string;
  artistId:    string;
  workIds:     string[];
  societyHint: string | null;
  periodStart: string | null;
  periodEnd:   string | null;
  metadata:    Record<string, unknown>;
}

export interface SocietySubmissionPayload extends RightsRegistrationPayload {
  societyId: string;
}

export interface SocietySubmissionStatus {
  submissionId: string;
  externalId:   string | null;
  protocol:     string | null;
  status:       string;
  pendingRequirements: string[];
  validationErrors:    string[];
  syncedAt:     string;
}

export interface SocietyProvider {
  societyId:   string;
  displayName: string;
  country:     string;
  supportsAPI: boolean;
}

export interface SocietyDataExchangeAdapter {
  submit(payload: SocietySubmissionPayload): Promise<SocietySubmissionStatus>;
  checkStatus(submissionId: string): Promise<SocietySubmissionStatus>;
}

export type ExternalDataExchangeAdapter = SocietyDataExchangeAdapter;

export const KNOWN_SOCIETY_PROVIDERS: ReadonlyArray<Pick<SocietyProvider, 'societyId' | 'displayName' | 'country'>> = [
  { societyId: 'ubc',     displayName: 'UBC',     country: 'BR' },
  { societyId: 'abramus', displayName: 'Abramus', country: 'BR' },
  { societyId: 'sicam',   displayName: 'Sicam',   country: 'BR' },
  { societyId: 'ecad',    displayName: 'ECAD',    country: 'BR' },
  { societyId: 'ascap',   displayName: 'ASCAP',   country: 'US' },
  { societyId: 'bmi',     displayName: 'BMI',     country: 'US' },
  { societyId: 'sesac',   displayName: 'SESAC',   country: 'US' },
  { societyId: 'prs',     displayName: 'PRS',     country: 'GB' },
];
