export type ImportFormat = "csv" | "xlsx" | "json" | "xml" | "ofx";

export type ImportStatus = "idle" | "uploading" | "previewing" | "mapping" | "importing" | "done" | "error";

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}
