/**
 * Society adapter contract.
 *
 * Three drivers, one interface. Only ManualExport is functional; PartnerApi and
 * PortalRpa are stubs disabled by default (env-gated) — no scraping, no private
 * endpoints, no unauthorised automation.
 */

import type { SocietyDriver } from '@music-os-360/types';

export interface SocietySubmissionResult {
  accepted: boolean;
  externalId: string | null;
  protocol: string | null;
  message: string;
}

export interface SocietySubmissionStatusResult {
  status: string;
  protocol: string | null;
  message: string;
}

export type ExportFormat = 'json' | 'csv';

export interface ExportResult {
  format: ExportFormat;
  content: string;
  mimeType: string;
  fileName: string;
}

export interface SocietyAdapter {
  readonly driver: SocietyDriver;
  /** False = stub/disabled. Mutating ops must refuse when not enabled. */
  readonly enabled: boolean;
  submitWork(payload: Record<string, unknown>): Promise<SocietySubmissionResult>;
  submitRecording(payload: Record<string, unknown>): Promise<SocietySubmissionResult>;
  getSubmissionStatus(externalId: string): Promise<SocietySubmissionStatusResult>;
  exportPayload(payload: Record<string, unknown>, format: ExportFormat, baseName: string): Promise<ExportResult>;
}
