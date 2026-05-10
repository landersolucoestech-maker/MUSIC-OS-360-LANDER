import { z } from "zod";

export const funcionarioSchema = z.object({
  nomeCompleto: z.string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(150, "Nome deve ter no máximo 150 caracteres")
    .trim(),
  email: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  cpf: z.string().max(20, "CPF inválido").optional().or(z.literal("")),
  rg: z.string().max(20, "RG inválido").optional().or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
  telefone: z.string().max(20, "Telefone inválido").optional().or(z.literal("")),
  endereco: z.string().max(300, "Endereço deve ter no máximo 300 caracteres").optional().or(z.literal("")),
  cargo: z.string().max(100, "Cargo deve ter no máximo 100 caracteres").optional().or(z.literal("")),
  setor: z.string().optional().or(z.literal("")),
  tipoContrato: z.string().optional().or(z.literal("")),
  dataAdmissao: z.string().optional().or(z.literal("")),
  salarioBase: z.number().min(0, "Salário não pode ser negativo").optional().nullable(),
  status: z.enum(["ativo", "inativo", "ferias", "licenca"]).default("ativo"),
  observacoes: z.string().max(2000, "Observações deve ter no máximo 2000 caracteres").optional().or(z.literal("")),
});

export type FuncionarioFormData = z.infer<typeof funcionarioSchema>;
