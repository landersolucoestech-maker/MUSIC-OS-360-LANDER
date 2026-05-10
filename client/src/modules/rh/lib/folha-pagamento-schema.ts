import { z } from "zod";

export const folhaPagamentoSchema = z.object({
  funcionarioId: z.string()
    .min(1, "Funcionário é obrigatório"),
  mesReferencia: z.string()
    .min(1, "Mês de referência é obrigatório"),
  salarioBruto: z.number()
    .min(0, "Salário bruto não pode ser negativo")
    .optional()
    .nullable(),
  descontos: z.number()
    .min(0, "Descontos não podem ser negativos")
    .optional()
    .nullable(),
  bonus: z.number()
    .min(0, "Bônus não pode ser negativo")
    .optional()
    .nullable(),
  dataPagamento: z.string().optional().or(z.literal("")),
  status: z.enum(["pendente", "processado", "pago", "cancelado"]).default("pendente"),
  observacoes: z.string()
    .max(2000, "Observações deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type FolhaPagamentoFormData = z.infer<typeof folhaPagamentoSchema>;
