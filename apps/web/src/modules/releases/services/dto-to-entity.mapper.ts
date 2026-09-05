/**
 * releases/mappers/dto-to-entity.mapper.ts
 * Contextual inheritance seeds: parent entity → child form pre-fill.
 */

import type { LancamentoFormFields } from "./entity-to-form.mapper";

export function projetoToLancamentoSeed(projeto: {
  id: string;
  titulo?: string | null;
  artist_id?: string | null;
  genero?: string | null;
  tipo?: string | null;
}): Partial<LancamentoFormFields> {
  return {
    projetoSeed: projeto.id,
    titulo:      projeto.titulo?.trim() ?? "",
    artist_id:  projeto.artist_id ?? "",
    genero:      projeto.genero ?? "",
    tipo:        projeto.tipo ?? "single",
  };
}
