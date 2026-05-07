/**
 * STEP 1+4+Events — Application Use Case: registerMusic
 *
 * STEP 1: Usa runInTransaction — se o fonograma falhar, a obra é revertida.
 * STEP 4: Lança erros tipados (ConflictError, ValidationError).
 * Domain Events: Emite MUSIC_REGISTERED após sucesso.
 */
import { obraService, fonogramaService } from "@/modules/catalog/services/catalog.service";
import { stampTenant } from "@/shared/lib/tenant";
import { storage } from "@/shared/lib/storage";
import { ConflictError, ValidationError } from "@/shared/lib/errors";
import { emit, DomainEvents } from "@/shared/domain-events";
import { getCurrentOrgId } from "@/shared/lib/tenant";
import type { ObraInsert, FonogramaInsert } from "@/modules/catalog/types";

export interface RegisterMusicInput {
  titulo: string;
  compositor?: string;
  compositores?: string;
  genero?: string;
  iswc?: string;
  isrc?: string;
  duracao?: string;
  tipo?: string;
  artista_id?: string;
  projeto_id?: string;
  withFonograma?: boolean;
  fonogramaData?: Partial<FonogramaInsert>;
  origem_externa?: string;
  origem_externa_id?: string;
  cod_abramus?: string;
}

export interface RegisterMusicResult {
  obra_id: string;
  fonograma_id?: string;
}

export async function registerMusicUseCase(
  input: RegisterMusicInput,
): Promise<RegisterMusicResult> {
  // 1. Validação de campos obrigatórios
  if (!input.titulo?.trim()) {
    throw new ValidationError("Dados inválidos", { titulo: "Título é obrigatório" });
  }

  // 2. Verificar unicidade de ISWC
  if (input.iswc?.trim()) {
    const existing = await obraService.list();
    const dup = existing.find(
      (o) =>
        o.iswc &&
        typeof o.iswc === "string" &&
        o.iswc.trim() === input.iswc!.trim(),
    );
    if (dup) {
      throw new ConflictError(
        `ISWC "${input.iswc}" já cadastrado no sistema.`,
        "iswc",
      );
    }
  }

  // 3. Operação atômica em transação
  const result = await storage.runInTransaction(async () => {
    const obraPayload: ObraInsert = stampTenant({
      titulo: input.titulo.trim(),
      compositor: input.compositor?.trim() || null,
      compositores: input.compositores?.trim() || null,
      genero: input.genero?.trim() || null,
      iswc: input.iswc?.trim() || null,
      isrc: input.isrc?.trim() || null,
      duracao: input.duracao?.trim() || null,
      tipo: (input.tipo || "musica") as string,
      status: "registrado",
      artista_id: input.artista_id || null,
      projeto_id: input.projeto_id || null,
      origem_externa: input.origem_externa || null,
      origem_externa_id: input.origem_externa_id || null,
      cod_abramus: input.cod_abramus || null,
    } as ObraInsert);

    const obra = await obraService.create(obraPayload);
    const obraId = obra.id as string;
    let fonogramaId: string | undefined;

    if (input.withFonograma) {
      const fonoPayload: FonogramaInsert = stampTenant({
        titulo: input.titulo.trim(),
        obra_id: obraId,
        artista_id: input.artista_id || null,
        isrc: input.isrc?.trim() || null,
        duracao: input.duracao?.trim() || null,
        tipo: "original",
        status: "registrado",
        origem_externa: input.origem_externa || null,
        origem_externa_id: input.origem_externa_id || null,
        cod_abramus: input.cod_abramus || null,
        ...(input.fonogramaData ?? {}),
      } as FonogramaInsert);

      const fono = await fonogramaService.create(fonoPayload);
      fonogramaId = fono.id as string;
    }

    return { obra_id: obraId, fonograma_id: fonogramaId };
  });

  // 4. Emitir evento de domínio
  emit(DomainEvents.MUSIC_REGISTERED, {
    obra_id: result.obra_id,
    fonograma_id: result.fonograma_id,
    titulo: input.titulo.trim(),
    org_id: getCurrentOrgId(),
  });

  return result;
}
