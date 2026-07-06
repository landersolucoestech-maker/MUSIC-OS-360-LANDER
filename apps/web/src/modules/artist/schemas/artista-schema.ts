/**
 * modules/artist/schemas/artista-schema.ts
 *
 * O schema de validação do formulário de artista é GERADO a partir da
 * definição única do formulário (forms/artist-form.definition.ts) —
 * id/label/tipo/ordem/seção/obrigatoriedade vivem exclusivamente lá.
 * Este arquivo apenas re-exporta para manter o caminho de import estável.
 */

export {
  artistaSchema,
  buildArtistaSchema,
  type ArtistaFormValues,
} from "@/modules/artist/forms/artist-form.definition";
