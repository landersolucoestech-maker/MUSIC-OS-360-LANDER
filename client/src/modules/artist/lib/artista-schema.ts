import { z } from "zod";

const distribuidoraSchema = z.object({
  id: z.string(),
  email: z.string(),
  nomeCustom: z.string().optional(),
});

const responsavelSchema = z.object({
  nome: z.string(),
  telefone: z.string(),
  email: z.string(),
});

const relacionamentoSchema = z.object({
  tipo: z.enum([
    "empresario", "gravadora", "editora", "booker",
    "juridico", "financeiro", "contador", "assessoria",
  ]),
  nome: z.string(),
  telefone: z.string(),
  email: z.string(),
  escritorio: z.string(),
  crc: z.string(),
  responsaveis: z.array(responsavelSchema),
  distribuidoras: z.array(distribuidoraSchema),
});

export const artistaSchema = z.object({
  // ── Seção 1: Informações Básicas ──
  nomeArtistico:  z.string().min(1, "Nome artístico é obrigatório").max(150).trim(),
  slugArtistico:  z.string().max(200).optional().or(z.literal("")),
  tagsMusicais:   z.array(z.string()).optional(),
  faseCarreira:   z.string().optional().or(z.literal("")),
  generoMusical:  z.string().optional().or(z.literal("")),
  especialidades: z.array(z.string()).optional(),
  biografia:      z.string().max(5000).optional().or(z.literal("")),
  notasInternas:  z.string().max(5000).optional().or(z.literal("")),

  // ── Seção 2: Dados Pessoais ──
  nome:           z.string().min(1, "Nome completo é obrigatório").max(150).trim(),
  dataNascimento: z.string().optional().or(z.literal("")),
  cpfCnpj:        z.string().max(20).optional().or(z.literal("")),
  rg:             z.string().max(20).optional().or(z.literal("")),
  genero:         z.string().optional().or(z.literal("")),
  endereco:       z.string().max(300).optional().or(z.literal("")),
  telefone:       z.string().max(20).optional().or(z.literal("")),
  email:          z.string().email("Email inválido").max(100).optional().or(z.literal("")),

  // ── Seção 3: Dados Bancários ──
  banco:        z.string().optional().or(z.literal("")),
  agencia:      z.string().optional().or(z.literal("")),
  conta:        z.string().optional().or(z.literal("")),
  chavePix:     z.string().max(150).optional().or(z.literal("")),
  titularConta: z.string().max(150).optional().or(z.literal("")),

  // ── Seção 4: Redes Sociais ──
  spotify:    z.string().max(300).optional().or(z.literal("")),
  instagram:  z.string().max(300).optional().or(z.literal("")),
  youtube:    z.string().max(300).optional().or(z.literal("")),
  tiktok:     z.string().max(300).optional().or(z.literal("")),
  soundcloud: z.string().max(300).optional().or(z.literal("")),
  deezer:     z.string().max(300).optional().or(z.literal("")),
  appleMusic: z.string().max(300).optional().or(z.literal("")),

  // ── Seção 5: Relacionamentos Comerciais ──
  relacionamentos: z.array(relacionamentoSchema).optional(),
});

export type ArtistaFormValues = z.infer<typeof artistaSchema>;
