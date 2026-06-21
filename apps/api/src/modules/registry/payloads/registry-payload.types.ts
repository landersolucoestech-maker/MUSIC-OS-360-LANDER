/**
 * Registry payload & validation contracts.
 *
 * Society-agnostic shapes. The generic builder produces these; society-specific
 * builders (e.g. ABRAMUS) wrap/translate them. Adapters serialise them.
 */

import type { RegistrableEntityType, SocietyValidationSeverity } from '@music-os-360/types';

export interface RegistryValidationIssue {
  severity: SocietyValidationSeverity;
  code: string;
  field_path: string | null;
  message: string;
}

export interface RegistryValidationResult {
  entityType: RegistrableEntityType;
  entityId: string;
  valid: boolean;
  errorCount: number;
  warningCount: number;
  issues: RegistryValidationIssue[];
}

export interface PayloadParty {
  name: string;
  document: string | null;
  role: string | null;
  percentage: number | null;
  ipi_cae: string | null;
  society: string | null;
  territory: string | null;
}

export interface PayloadIdentifier {
  provider: string;
  type: string;
  value: string;
  is_primary: boolean;
}

export interface WorkRegistryPayload {
  kind: 'WORK';
  work: {
    id: string;
    title: string;
    alternative_titles: unknown[];
    type: string | null;
    genre: string | null;
    language: string | null;
    iswc: string | null;
    duration_seconds: number | null;
    is_instrumental: boolean | null;
  };
  authors: PayloadParty[];
  publishers: PayloadParty[];
  splits: PayloadParty[];
  identifiers: PayloadIdentifier[];
  ai_declaration: {
    ai_used: boolean;
    ai_tools: unknown[];
    ai_prompts: unknown[];
  };
  metadata: Record<string, unknown>;
}

export interface RecordingRegistryPayload {
  kind: 'RECORDING';
  recording: {
    id: string;
    title: string;
    version_title: string | null;
    isrc: string | null;
    duration_seconds: number | null;
    recording_date: string | null;
    release_date: string | null;
    copyright_year: number | null;
    copyright_owner: string | null;
    country_of_recording: string | null;
  };
  linked_work: { id: string | null };
  main_artist: { id: string | null };
  phonographic_producer: { id: string | null };
  contributors: PayloadParty[];
  identifiers: PayloadIdentifier[];
  metadata: Record<string, unknown>;
}

export type RegistryPayload = WorkRegistryPayload | RecordingRegistryPayload;
