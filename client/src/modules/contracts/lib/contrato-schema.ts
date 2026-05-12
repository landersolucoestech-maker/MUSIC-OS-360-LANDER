import { z } from "zod";

export const SIGNER_ROLES = ["artista", "label", "testemunha", "procurador", "produtor", "advogado"] as const;
export type ContratoSignerRole = typeof SIGNER_ROLES[number];

export const SIGNER_ROLE_LABEL: Record<ContratoSignerRole, string> = {
  artista:    "Artista",
  label:      "Gravadora / Label",
  testemunha: "Testemunha",
  procurador: "Procurador",
  produtor:   "Produtor",
  advogado:   "Advogado",
};

export const contratoSignerSchema = z.object({
  name:  z.string().min(1, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  role:  z.enum(SIGNER_ROLES),
});

export type ContratoSigner = z.infer<typeof contratoSignerSchema>;

export const contratoSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  client_type: z.enum(["artista", "pessoa_fisica", "pessoa_juridica"], {
    required_error: "Tipo de cliente é obrigatório",
  }),
  service_type: z.enum(
    [
      "empresariamento", "empresariamento_suporte", "gestao", "agenciamento",
      "edicao", "distribuicao", "marketing", "producao_musical",
      "producao_audiovisual", "licenciamento", "publicidade", "parceria",
      "shows", "outros",
    ],
    { required_error: "Tipo de serviço é obrigatório" },
  ),
  artist_id: z.string().optional(),
  company_id: z.string().optional(),
  contractor_contact: z.string().optional(),
  responsible_person: z.string().optional(),
  status: z.enum([
    "pendente", "assinado", "aguardando_assinatura", "ativo", "vigente",
    "expirado", "rescindido", "cancelado", "rascunho",
  ]).default("rascunho"),
  arquivo_url: z.string().optional(),
  notas_versao: z.string().optional(),
  lancamento_id: z.string().optional(),
  start_date: z.date({ required_error: "Data de início é obrigatória" }),
  end_date: z.date().optional(),
  registry_office: z.boolean().optional(),
  registry_date: z.date().optional(),
  payment_type: z.enum(["valor_fixo", "royalties"]).optional(),
  fixed_value: z.number().optional(),
  royalties_percentage: z.number().min(0).max(100).optional(),
  advance_payment: z.number().optional(),
  financial_support: z.number().optional(),
  observations: z.string().optional(),
  terms: z.string().optional(),
  signers: z.array(contratoSignerSchema).default([]),
});

export type ContratoFormData = z.infer<typeof contratoSchema>;
