import { z } from "zod";

export const transacaoSchema = z.object({
  tipoTransacao: z.string()
    .min(1, "Selecione o tipo de transação"),
  tipoCliente: z.string().optional().or(z.literal("")),
  categoria: z.string().optional().or(z.literal("")),
  subcategoria: z.string().optional().or(z.literal("")),
  descricao: z.string()
    .min(1, "Informe a descrição")
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .trim(),
  valor: z.string()
    .refine(
      (v) => !!v && !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      { message: "Informe um valor válido" }
    ),
  dataTransacao: z.string()
    .min(1, "Informe a data da transação"),
  status: z.string().optional().or(z.literal("")),
  observacao: z.string()
    .max(2000, "Observação deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  artistaVinculado: z.string().optional().or(z.literal("")),
  projetoVinculado: z.string().optional().or(z.literal("")),
  contratoVinculado: z.string().optional().or(z.literal("")),
  eventoVinculado: z.string().optional().or(z.literal("")),
  fornecedorCliente: z.string().max(200, "Nome deve ter no máximo 200 caracteres").optional().or(z.literal("")),
  orgaoArrecadador: z.string().optional().or(z.literal("")),
  itemInvestimento: z.string().optional().or(z.literal("")),
  motivoViagem: z.string().max(300, "Motivo deve ter no máximo 300 caracteres").optional().or(z.literal("")),
  nomePublicidade: z.string().max(200, "Nome deve ter no máximo 200 caracteres").optional().or(z.literal("")),
  formaPagamento: z.string()
    .min(1, "Selecione a forma de pagamento"),
  tipoPagamento: z.string().optional().or(z.literal("")),
  quantidadeParcelas: z.string().optional().or(z.literal("")),
  intervaloParcelas: z.string().optional().or(z.literal("")),
  dataPrimeiraParcela: z.string().optional().or(z.literal("")),
  anexoUrl: z.string().max(500, "URL deve ter no máximo 500 caracteres").optional().or(z.literal("")),
  anexoNome: z.string().max(200, "Nome deve ter no máximo 200 caracteres").optional().or(z.literal("")),
});

export type TransacaoFormSchema = z.infer<typeof transacaoSchema>;
