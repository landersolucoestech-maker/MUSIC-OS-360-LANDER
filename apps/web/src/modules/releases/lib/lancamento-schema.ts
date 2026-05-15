import { z } from "zod";

export const lancamentoSchema = z.object({
  titulo: z.string()
    .min(1, "Título do lançamento é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .trim(),
  artista_id: z.string()
    .min(1, "Artista é obrigatório"),
  tipo: z.string()
    .min(1, "Tipo é obrigatório"),
  genero: z.string().optional().or(z.literal("")),
  idioma: z.string().optional().or(z.literal("")),
  dataLancamento: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  gravadora: z.string().max(150, "Gravadora deve ter no máximo 150 caracteres").optional().or(z.literal("")),
  copyright: z.string().max(200, "Copyright deve ter no máximo 200 caracteres").optional().or(z.literal("")),
  distribuidora: z.string().optional().or(z.literal("")),
  codigoUPC: z.string().max(20, "UPC deve ter no máximo 20 caracteres").optional().or(z.literal("")),
  isrcGlobal: z.string().max(20, "ISRC deve ter no máximo 20 caracteres").optional().or(z.literal("")),
  notasDistribuicao: z.string().max(2000, "Notas deve ter no máximo 2000 caracteres").optional().or(z.literal("")),
  notasInternas: z.string().max(2000, "Notas deve ter no máximo 2000 caracteres").optional().or(z.literal("")),
  assetAudioMasterUrl: z.string().optional().or(z.literal("")),
  assetCapaUrl: z.string().optional().or(z.literal("")),
  assetVideoClipeUrl: z.string().optional().or(z.literal("")),
  assetLetra: z.string().optional().or(z.literal("")),
  assetFichaTecnica: z.string().optional().or(z.literal("")),
  assetPressRelease: z.string().optional().or(z.literal("")),
  assetEpkUrl: z.string().optional().or(z.literal("")),
  cronGravacao: z.string().optional().or(z.literal("")),
  cronMixMaster: z.string().optional().or(z.literal("")),
  cronEntregaDistribuidora: z.string().optional().or(z.literal("")),
});

export type LancamentoFormData = z.infer<typeof lancamentoSchema>;
