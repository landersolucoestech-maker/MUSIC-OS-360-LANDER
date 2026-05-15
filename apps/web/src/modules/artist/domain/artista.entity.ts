/**
 * STEP 3 — Domain Entity: Artista
 *
 * Encapsula as invariants e regras de negócio do domínio Artista.
 * Expõe factory methods que validam antes de criar — nenhum objeto
 * inválido pode ser instanciado.
 */
import { ValidationError } from "@/shared/lib/errors";

export interface ArtistaData {
  id: string;
  nome_artistico?: string | null;
  nome_civil?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  status?: string | null;
  tipo?: string | null;
  genero_musical?: string | null;
  org_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type DuplicateField = "email" | "cpf_cnpj" | null;

/**
 * Detecta duplicata por email ou CPF/CNPJ.
 * Retorna qual campo está duplicado, ou null se não há duplicata.
 */
export function detectDuplicate(
  existing: ArtistaData[],
  candidate: { email?: string; cpf_cnpj?: string },
): DuplicateField {
  const emailNorm = candidate.email?.trim().toLowerCase();
  const cpf = candidate.cpf_cnpj?.trim();

  for (const a of existing) {
    if (
      emailNorm &&
      typeof a.email === "string" &&
      a.email.toLowerCase() === emailNorm
    ) {
      return "email";
    }
    if (cpf && a.cpf_cnpj === cpf) {
      return "cpf_cnpj";
    }
  }
  return null;
}

/**
 * STEP 3 — Valida dados mínimos para cadastro de artista.
 * Retorna mapa de erros por campo.
 * @throws ValidationError se campos obrigatórios estiverem inválidos.
 */
export function validateArtista(
  data: Partial<ArtistaData>,
  options: { strict?: boolean } = {},
): void {
  const errors: Record<string, string> = {};

  if (!data.nome_artistico?.trim()) {
    errors.nome_artistico = "Nome artístico é obrigatório";
  }

  if (options.strict) {
    if (!data.email?.trim()) {
      errors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "E-mail inválido";
    }
    if (!data.tipo) {
      errors.tipo = "Tipo de artista é obrigatório";
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Dados inválidos para artista", errors);
  }
}

/**
 * STEP 3 — Factory method seguro.
 * Valida antes de retornar um ArtistaData parcial pronto para persistir.
 * Nenhum artista inválido pode ser criado via este método.
 *
 * @deprecated Use createArtistUseCase para criação completa com persistência.
 */
export function buildArtistaPayload(
  input: Partial<ArtistaData>,
  options: { strict?: boolean } = {},
): Omit<ArtistaData, "id" | "created_at" | "updated_at"> {
  validateArtista(input, options);
  return {
    nome_artistico: input.nome_artistico!.trim(),
    nome_civil: input.nome_civil?.trim() || null,
    tipo: input.tipo || null,
    status: input.status || "ativo",
    genero_musical: input.genero_musical?.trim() || null,
    email: input.email?.trim() || null,
    telefone: (input.telefone as string | undefined)?.trim() || null,
    cpf_cnpj: input.cpf_cnpj?.trim() || null,
    foto_url: (input.foto_url as string | undefined)?.trim() || null,
    observacoes: (input.observacoes as string | undefined) || null,
    org_id: input.org_id || null,
  };
}

/** Valida dados mínimos (compatibilidade com código antigo). */
export function validateArtistaMinimum(data: Partial<ArtistaData>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.nome_artistico?.trim()) {
    errors.nome_artistico = "Nome artístico é obrigatório";
  }
  if (!data.email?.trim()) {
    errors.email = "E-mail é obrigatório";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "E-mail inválido";
  }
  return errors;
}

/** Retorna o nome completo de exibição. */
export function getDisplayName(artista: ArtistaData): string {
  return artista.nome_artistico || artista.nome_civil || "—";
}

/** Verifica se o artista está em status ativo/contratado. */
export function isArtistaActive(artista: ArtistaData): boolean {
  return artista.status === "contratado" || artista.status === "ativo";
}
