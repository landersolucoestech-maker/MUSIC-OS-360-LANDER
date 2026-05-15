import { z } from "zod";

export const crmPessoaFisicaSchema = z.object({
  nomeCompletoPF: z.string()
    .min(1, "Nome é obrigatório")
    .max(150, "Nome deve ter no máximo 150 caracteres")
    .trim(),
  emailPF: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  telefonePF: z.string().max(20, "Telefone inválido").optional().or(z.literal("")),
  cpfPF: z.string().max(20, "CPF inválido").optional().or(z.literal("")),
  categoriaPF: z.string().optional().or(z.literal("")),
  funcaoPF: z.string().optional().or(z.literal("")),
});

export const crmPessoaJuridicaSchema = z.object({
  razaoSocialPJ: z.string()
    .min(1, "Razão social é obrigatória")
    .max(150, "Razão social deve ter no máximo 150 caracteres")
    .trim(),
  cnpjPJ: z.string().max(20, "CNPJ inválido").optional().or(z.literal("")),
  emailPJ: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  telefonePJ: z.string().max(20, "Telefone inválido").optional().or(z.literal("")),
  categoriaPJ: z.string().optional().or(z.literal("")),
  nomeResponsavelPJ: z.string().max(150, "Nome deve ter no máximo 150 caracteres").optional().or(z.literal("")),
  emailResponsavelPJ: z.string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  telefoneResponsavelPJ: z.string().max(20, "Telefone inválido").optional().or(z.literal("")),
  cargoPJ: z.string().max(100, "Cargo deve ter no máximo 100 caracteres").optional().or(z.literal("")),
});

export const crmEnderecoSchema = z.object({
  cep: z.string().max(10, "CEP inválido").optional().or(z.literal("")),
  logradouro: z.string().max(200, "Logradouro deve ter no máximo 200 caracteres").optional().or(z.literal("")),
  numero: z.string().max(20, "Número deve ter no máximo 20 caracteres").optional().or(z.literal("")),
  complemento: z.string().max(100, "Complemento deve ter no máximo 100 caracteres").optional().or(z.literal("")),
  bairro: z.string().max(100, "Bairro deve ter no máximo 100 caracteres").optional().or(z.literal("")),
  cidade: z.string().max(100, "Cidade deve ter no máximo 100 caracteres").optional().or(z.literal("")),
  estado: z.string().max(2, "Estado deve ter 2 caracteres").optional().or(z.literal("")),
});

export const crmContatoBaseSchema = z.object({
  tipoContato: z.enum(["pessoa_fisica", "pessoa_juridica"]),
  statusContato: z.enum(["frio", "morno", "quente", "cliente", "inativo"]),
  prioridadeContato: z.enum(["baixa", "media", "alta"]),
  observacoes: z.string().max(2000, "Observações deve ter no máximo 2000 caracteres").optional().or(z.literal("")),
});

export type CRMContatoBase = z.infer<typeof crmContatoBaseSchema>;
export type CRMPessoaFisica = z.infer<typeof crmPessoaFisicaSchema>;
export type CRMPessoaJuridica = z.infer<typeof crmPessoaJuridicaSchema>;
export type CRMEndereco = z.infer<typeof crmEnderecoSchema>;
