import { z } from "zod";

export const artistaSchema = z.object({
  nomeArtistico: z.string()
    .min(1, "Nome artístico é obrigatório")
    .max(150, "Nome artístico deve ter no máximo 150 caracteres")
    .trim(),
  nome: z.string()
    .min(1, "Nome completo é obrigatório")
    .max(150, "Nome completo deve ter no máximo 150 caracteres")
    .trim(),
  generoMusical: z.string().optional().or(z.literal("")),
  especialidades: z.array(z.string()).optional(),
  biografia: z.string()
    .max(5000, "Biografia deve ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
  notasInternas: z.string()
    .max(5000, "Notas devem ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
  cpfCnpj: z.string().max(20, "CPF/CNPJ inválido").optional().or(z.literal("")),
  rg: z.string().max(20, "RG inválido").optional().or(z.literal("")),
  genero: z.string().optional().or(z.literal("")),
  endereco: z.string().max(300, "Endereço deve ter no máximo 300 caracteres").optional().or(z.literal("")),
  telefone: z.string().max(20, "Telefone inválido").optional().or(z.literal("")),
  email: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  banco: z.string().optional().or(z.literal("")),
  agencia: z.string().optional().or(z.literal("")),
  conta: z.string().optional().or(z.literal("")),
  chavePix: z.string().max(150, "Chave PIX inválida").optional().or(z.literal("")),
  titularConta: z.string().max(150, "Nome do titular inválido").optional().or(z.literal("")),
  spotify: z.string().max(300, "URL inválida").optional().or(z.literal("")),
  instagram: z.string().max(300, "URL inválida").optional().or(z.literal("")),
  youtube: z.string().max(300, "URL inválida").optional().or(z.literal("")),
  tiktok: z.string().max(300, "URL inválida").optional().or(z.literal("")),
  soundcloud: z.string().max(300, "URL inválida").optional().or(z.literal("")),
  deezer: z.string().max(300, "URL inválida").optional().or(z.literal("")),
  appleMusic: z.string().max(300, "URL inválida").optional().or(z.literal("")),
  tipoPerfil: z.enum(["independente", "com_empresario", "gravadora", "editora"]).default("independente"),
  distribuidorasGerais: z.array(z.object({
    id: z.string(),
    email: z.string(),
    nomeCustom: z.string().optional(),
  })).optional(),
  // Vínculos com contatos do CRM (apenas referências; dados resolvidos do CRM)
  contatosVinculados: z.array(z.object({
    contactId: z.string(),
    distribuidoras: z.array(z.object({
      id: z.string(),
      email: z.string(),
      nomeCustom: z.string().optional(),
    })),
  })).optional(),
});

export type ArtistaFormValues = z.infer<typeof artistaSchema>;

