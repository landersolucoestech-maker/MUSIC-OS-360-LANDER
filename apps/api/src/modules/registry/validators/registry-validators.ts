/**
 * Registry validators — pure, dependency-free document/identifier checks.
 * Used by services to reject malformed CPF/CNPJ, ISRC, ISWC, IPI before persist.
 */

export function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Brazilian CPF check-digit validation. */
export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

/** Brazilian CNPJ check-digit validation. */
export function isValidCnpj(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number): number => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(cnpj[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

/** Validate a document by declared type. Unknown/empty types pass (optional). */
export function isValidDocument(documentType: string | null | undefined, value: string | null | undefined): boolean {
  if (!value) return true;
  switch ((documentType ?? '').toUpperCase()) {
    case 'CPF':
      return isValidCpf(value);
    case 'CNPJ':
      return isValidCnpj(value);
    default:
      return true; // PASSPORT/OTHER/unknown — not structurally validated here
  }
}

/** ISRC: CC-XXX-YY-NNNNN (12 chars, dashes optional). e.g. BRABC2600001. */
export function normalizeIsrc(value: string): string {
  return (value ?? '').toUpperCase().replace(/[\s-]/g, '');
}
export function isValidIsrc(input: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(normalizeIsrc(input));
}

/** ISWC: T-DDD.DDD.DDD-C (T + 9 digits + 1 check digit, separators optional). */
export function normalizeIswc(value: string): string {
  return (value ?? '').toUpperCase().replace(/[\s.-]/g, '');
}
export function isValidIswc(input: string): boolean {
  return /^T\d{10}$/.test(normalizeIswc(input));
}

/** IPI/CAE: 9–11 digits (loose — societies vary). Empty allowed. */
export function isValidIpiCae(input: string | null | undefined): boolean {
  if (!input) return true;
  return /^\d{9,11}$/.test(onlyDigits(input));
}
