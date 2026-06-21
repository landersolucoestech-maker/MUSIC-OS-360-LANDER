/**
 * STEP 4 — Application Use Case: createArtist
 *
 * Orquestra a criação de um artista com validação de duplicatas,
 * enriquecimento de dados e persistência via service layer.
 *
 * Emite ARTIST_CREATED para o bus de eventos (domain-events/index.ts)
 * sem acoplamento a outros módulos.
 */
import { artistaService } from "@/modules/artist/services/artista.service";
import { stampTenant } from "@/shared/lib/tenant";
import { detectDuplicate } from "@/modules/artist/domain/artista.entity";
import { ConflictError, ValidationError } from "@/shared/lib/errors";
import { emit, DomainEvents } from "@/shared/domain-events";
import type { ArtistaInsert } from "@/modules/artist/types/artista.types";

/** Erro específico de duplicata de artista. */
export class DuplicateArtistaError extends ConflictError {
  constructor(
    public readonly field: "email" | "cpf_cnpj",
    message: string,
  ) {
    super(message, field);
    this.name = "DuplicateArtistaError";
  }
}

export interface CreateArtistaInput {
  nome_artistico: string;
  nome_civil?: string;
  tipo?: string;
  status?: string;
  genero_musical?: string;
  email?: string;
  telefone?: string;
  cpf_cnpj?: string;
  data_nascimento?: string;
  foto_url?: string;
  observacoes?: string;
  org_slug?: string;
  redes_sociais?: string;
  // redes sociais individuais
  instagram?: string;
  tiktok?: string;
  youtube_channel_id?: string;
  spotify_artist_id?: string;
  deezer_url?: string;
  soundcloud_url?: string;
  apple_music_url?: string;
  // docs e links extras
  presskit_url?: string;
  notas_internas?: string;
  // vínculo com empresário
  empresario_nome?: string;
  empresario_telefone?: string;
  empresario_email?: string;
  // vínculo com gravadora / editora
  gravadora_nome?: string;
  gravadora_responsavel_nome?: string;
  gravadora_responsavel_telefone?: string;
  gravadora_responsavel_email?: string;
  // distribuidoras
  distribuidoras_selecionadas?: Record<string, boolean>;
  distribuidoras_emails?: Record<string, string>;
  [key: string]: unknown;
}

export async function createArtistUseCase(
  input: CreateArtistaInput,
): Promise<{ id: string; nome_artistico: string }> {
  // 1. Validação de campos obrigatórios
  const validationErrors: Record<string, string> = {};
  if (!input.nome_artistico?.trim()) {
    validationErrors.nome_artistico = "Nome artístico é obrigatório";
  }
  if (Object.keys(validationErrors).length > 0) {
    throw new ValidationError("Dados inválidos para criação de artista", validationErrors);
  }

  // 2. Carregar artistas existentes para verificar duplicatas
  const existing = await artistaService.list();

  // 3. Detectar duplicata (invariant de domínio)
  const duplicate = detectDuplicate(existing, {
    email: input.email,
    cpf_cnpj: input.cpf_cnpj,
  });

  if (duplicate === "email") {
    throw new DuplicateArtistaError("email", "E-mail já cadastrado nesta organização.");
  }
  if (duplicate === "cpf_cnpj") {
    throw new DuplicateArtistaError("cpf_cnpj", "CPF/CNPJ já cadastrado nesta organização.");
  }

  // 4. Enriquecer com redes sociais
  const observacoes = [input.observacoes, input.redes_sociais]
    .filter(Boolean)
    .join("\n\nRedes Sociais: ");

  // 5. Construir payload com tenant stamp
  const payload: ArtistaInsert = stampTenant({
    nome_artistico: input.nome_artistico.trim(),
    nome_civil: input.nome_civil?.trim() || null,
    tipo: input.tipo || null,
    status: (input.status as string) || "ativo",
    genero_musical: input.genero_musical?.trim() || null,
    email: input.email?.trim() || null,
    telefone: input.telefone?.trim() || null,
    cpf_cnpj: input.cpf_cnpj?.trim() || null,
    data_nascimento: input.data_nascimento?.trim() || null,
    foto_url: input.foto_url?.trim() || null,
    observacoes: observacoes || null,
    org_slug: input.org_slug ?? null,
    // redes sociais individuais
    instagram: input.instagram?.trim() || null,
    tiktok: input.tiktok?.trim() || null,
    youtube_channel_id: input.youtube_channel_id?.trim() || null,
    spotify_artist_id: input.spotify_artist_id?.trim() || null,
    deezer_url: input.deezer_url?.trim() || null,
    soundcloud_url: input.soundcloud_url?.trim() || null,
    apple_music_url: input.apple_music_url?.trim() || null,
    // docs
    presskit_url: input.presskit_url?.trim() || null,
    notas_internas: input.notas_internas?.trim() || null,
    // vínculo empresário
    empresario_nome: input.empresario_nome?.trim() || null,
    empresario_telefone: input.empresario_telefone?.trim() || null,
    empresario_email: input.empresario_email?.trim() || null,
    // vínculo gravadora / editora
    gravadora_nome: input.gravadora_nome?.trim() || null,
    gravadora_responsavel_nome: input.gravadora_responsavel_nome?.trim() || null,
    gravadora_responsavel_telefone: input.gravadora_responsavel_telefone?.trim() || null,
    gravadora_responsavel_email: input.gravadora_responsavel_email?.trim() || null,
    // distribuidoras
    distribuidoras_selecionadas: input.distribuidoras_selecionadas ?? null,
    distribuidoras_emails: input.distribuidoras_emails ?? null,
  } as ArtistaInsert);

  // 6. Persistir via service
  const created = await artistaService.create(payload);
  const id = created.id as string;
  const nome_artistico = created.nome_artistico as string;

  // STEP 1 — Emitir evento de domínio (ARTIST_CREATED)
  emit(DomainEvents.ARTIST_CREATED, {
    id,
    nome_artistico,
    org_id: (created as Record<string, unknown>).org_id as string,
  });

  return { id, nome_artistico };
}

