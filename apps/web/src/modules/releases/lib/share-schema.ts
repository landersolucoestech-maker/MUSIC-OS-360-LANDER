import { z } from "zod";

export const shareSchema = z.object({
  nome_musica: z.string()
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .optional()
    .or(z.literal("")),
  detentor: z.string()
    .max(150, "Detentor deve ter no máximo 150 caracteres")
    .optional()
    .or(z.literal("")),
  funcao: z.enum(["compositor", "interprete", "produtor", "editora", "gravadora", "empresario", "outro"]).optional(),
  direcao: z.enum(["a_receber", "a_pagar", "a_enviar"]).default("a_receber"),
  percentual: z.string()
    .refine(
      (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 100),
      { message: "Percentual deve ser entre 0 e 100" }
    )
    .optional()
    .or(z.literal("")),
  status: z.enum(["pendente", "parcial", "recebido", "enviado", "cancelado"]).default("pendente"),
  acordo_notas: z.string()
    .max(2000, "Notas devem ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  acordo_url: z.string()
    .max(500, "URL deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  observacoes: z.string()
    .max(2000, "Observações deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type ShareFormData = z.infer<typeof shareSchema>;
