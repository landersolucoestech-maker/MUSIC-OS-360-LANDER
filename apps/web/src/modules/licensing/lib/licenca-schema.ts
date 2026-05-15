import { z } from "zod";

export const licencaSchema = z.object({
  titulo: z.string()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .trim(),
  tipoLicenca: z.string().optional().or(z.literal("")),
  obraMusical: z.string()
    .min(1, "Obra musical é obrigatória")
    .max(200, "Nome da obra deve ter no máximo 200 caracteres")
    .trim(),
  artista: z.string().max(150, "Nome do artista deve ter no máximo 150 caracteres").optional().or(z.literal("")),
  cliente: z.string()
    .min(1, "Cliente é obrigatório")
    .max(150, "Nome do cliente deve ter no máximo 150 caracteres")
    .trim(),
  projeto: z.string().max(200, "Nome do projeto deve ter no máximo 200 caracteres").optional().or(z.literal("")),
  midiaDestino: z.string().max(150, "Mídia de destino deve ter no máximo 150 caracteres").optional().or(z.literal("")),
  territorio: z.string().max(150, "Território deve ter no máximo 150 caracteres").optional().or(z.literal("")),
  dataInicio: z.string().optional().or(z.literal("")),
  dataFim: z.string().optional().or(z.literal("")),
  valor: z.string().optional().or(z.literal("")),
  moeda: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  observacoes: z.string().max(2000, "Observações deve ter no máximo 2000 caracteres").optional().or(z.literal("")),
});

export type LicencaFormData = z.infer<typeof licencaSchema>;
