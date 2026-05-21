declare module "mammoth" {
  interface ConversionResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  interface ExtractOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: ArrayBuffer;
  }
  export function extractRawText(options: ExtractOptions): Promise<ConversionResult>;
  export function convertToHtml(options: ExtractOptions): Promise<ConversionResult>;
}
