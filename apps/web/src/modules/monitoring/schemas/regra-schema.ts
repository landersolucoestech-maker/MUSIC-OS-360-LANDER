import { z } from "zod";

export const regraSchema = z.object({
  category: z.string()
    .min(1, "Informe o nome da categoria")
    .max(50, "Categoria deve ter no máximo 50 caracteres")
    .trim(),
  type: z.enum(["Receita", "Despesa"], {
    errorMap: () => ({ message: "Selecione o tipo" }),
  }),
  keywords: z.string()
    .min(1, "Informe pelo menos uma palavra-chave")
    .max(500, "Palavras-chave devem ter no máximo 500 caracteres")
    .trim(),
});

export type RegraFormData = z.infer<typeof regraSchema>;
