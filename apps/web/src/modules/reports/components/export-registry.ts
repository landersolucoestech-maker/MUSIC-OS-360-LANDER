/**
 * reports/components/export-registry.ts
 *
 * Registry ÚNICO e orientado a metadados dos módulos exportáveis/importáveis.
 *
 * - As colunas NÃO são hardcoded: são derivadas dinamicamente dos registros reais
 *   (união de todas as chaves), de modo que qualquer campo novo aparece
 *   automaticamente na exportação/importação, sem manutenção manual.
 * - O dropdown de módulos é alimentado por este registry (não por lista manual).
 * - Cada módulo expõe seus registros reais (via hooks de dados do sistema) e,
 *   quando suportado, um `create` real para importação/persistência.
 *
 * Para tornar um módulo elegível, basta registrá-lo aqui (um único ponto).
 */

import { useMemo } from "react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useNotasFiscais } from "@/modules/accounting/hooks/useNotasFiscais";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useShares } from "@/modules/releases/hooks/useShares";
import { useContacts } from "@/modules/crm-relationships/hooks/useContacts";

export interface ColumnDef {
  key: string;
  label: string;
}

export interface ExportModule {
  /** Rótulo PT-BR e identidade do módulo no dropdown. */
  key: string;
  /** Registros reais do módulo (estrutura completa). */
  records: Record<string, unknown>[];
  /** Persiste um registro importado, quando o módulo suporta. */
  create?: (record: Record<string, unknown>) => Promise<unknown>;
}

type MutationLike = { mutateAsync?: (input: unknown) => Promise<unknown> } | undefined | null;

function asRecords(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

function asCreate(mutation: MutationLike): ExportModule["create"] | undefined {
  if (mutation && typeof mutation.mutateAsync === "function") {
    return (record: Record<string, unknown>) => mutation.mutateAsync!(record);
  }
  return undefined;
}

/** Converte uma chave técnica em rótulo legível (Title Case PT-BR). */
export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Política universal de campos (vale para TODOS os módulos) ───────────────────
// Fonte única de verdade do que entra/sai na exportação e importação.

/** Campos internos/técnicos/infra que NUNCA aparecem na planilha. */
const INTERNAL_FIELD_KEYS = new Set<string>([
  "id", "user_id", "userid", "tenant_id", "tenantid", "org_id", "orgid",
  "org_slug", "orgslug", "slug", "created_by", "updated_by", "createdby",
  "updatedby", "metadata", "correlation_id", "correlationid", "_typeoperacao",
  "payload", "payloadoperacional", "payload_operacional",
].map((k) => k.toLowerCase()));

/** Renomeações explícitas pedidas: identificadores de streaming → link. */
const FIELD_RENAMES: Record<string, string> = {
  spotify_artist_id: "Link do Spotify",
  youtube_channel_id: "Link do YouTube",
};

/**
 * Dicionário pt-BR centralizado e OBRIGATÓRIO (acentuação correta).
 * Chaves sempre em minúsculas (snake_case ou camelCase achatados).
 * Sem fallback em inglês: ver `findUntranslatedLabels`.
 */
const FIELD_LABELS: Record<string, string> = {
  // ── Genéricos / comuns ──────────────────────────────────────────────────────
  name: "Nome",
  nome: "Nome",
  companyname: "Empresa",
  company_name: "Empresa",
  empresa: "Empresa",
  contacttype: "Tipo de Contato",
  contact_type: "Tipo de Contato",
  documenttype: "Tipo de Documento",
  documentnumber: "Número do Documento",
  phone: "Telefone",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  website: "Site",
  address: "Endereço",
  endereco: "Endereço",
  city: "Cidade",
  cidade: "Cidade",
  state: "Estado",
  estado: "Estado",
  country: "País",
  pais: "País",
  zipcode: "CEP",
  cep: "CEP",
  responsible: "Responsável",
  responsavel: "Responsável",
  notes: "Observações",
  observacoes: "Observações",
  observacao: "Observação",
  observations: "Observações",
  tags: "Etiquetas",
  status: "Situação",
  situacao: "Situação",
  priority: "Prioridade",
  prioridade: "Prioridade",
  timeline: "Linha do Tempo",
  attachments: "Anexos",
  anexos: "Anexos",
  descricao: "Descrição",
  description: "Descrição",
  // ── Artistas / streaming ────────────────────────────────────────────────────
  genero_musical: "Gênero Musical",
  nome_artistico: "Nome Artístico",
  nome_civil: "Nome Civil",
  cpf_cnpj: "CPF/CNPJ",
  data_nascimento: "Data de Nascimento",
  fase_carreira: "Fase da Carreira",
  manager_name: "Nome do Empresário",
  manager_nome: "Nome do Empresário",
  manager_contact: "Contato do Empresário",
  manager_contato: "Contato do Empresário",
  banner_url: "Banner",
  foto_url: "Foto",
  presskit_url: "Press Kit",
  soundcloud_url: "SoundCloud",
  apple_music_url: "Apple Music",
  deezer_url: "Deezer",
  website_url: "Site",
  documentos_pessoais_url: "Documentos Pessoais",
  video_apresentacao_url: "Vídeo de Apresentação",
  galeria_urls: "Galeria",
  instagram_seguidores: "Seguidores no Instagram",
  tiktok_seguidores: "Seguidores no TikTok",
  spotify_ouvintes: "Ouvintes no Spotify",
  youtube_inscritos: "Inscritos no YouTube",
  // ── Contratos / financeiro ──────────────────────────────────────────────────
  signing_platform: "Plataforma de Assinatura",
  numero: "Número",
  valor: "Valor",
  emissao: "Emissão",
  vencimento: "Vencimento",
  comissao: "Comissão",
  porcentagem: "Porcentagem",
  participacao: "Participação",
  titulo: "Título",
  funcao: "Função",
  data_inicio: "Data de Início",
  data_fim: "Data de Fim",
};

/**
 * Tokens que indicam um rótulo AINDA em inglês (chave não traduzida pelo
 * dicionário). Não inclui nomes próprios/marcas intencionais (Banner, Apple
 * Music, SoundCloud, Instagram, WhatsApp, Spotify, YouTube…), que são rótulos
 * finais válidos em pt-BR.
 */
const ENGLISH_TOKEN = new RegExp(
  String.raw`\b(Name|Company|Contact|Type|Phone|Email|Website|Address|City|State|Country|Zip|Notes|Priority|Timeline|Attachments|Tags|Manager|Signing|Platform|Document|Number|Responsible|Url|Created|Updated|Deleted|Slug)\b`,
  "i",
);

/**
 * Detecta campos cujo rótulo derivado ainda contém termos em inglês
 * (dicionário incompleto). Usado para impedir publicação de labels mistos.
 */
export function findUntranslatedLabels(keys: string[]): string[] {
  return keys.filter((k) => {
    if (isInternalField(k)) return false;
    const label = fieldLabel(k);
    return label.startsWith("⚠") || ENGLISH_TOKEN.test(label);
  });
}

const KEY_FOR_LABEL: Map<string, string> = (() => {
  const m = new Map<string, string>();
  // Renames primeiro; depois rótulos, sem sobrescrever (primeira chave vence
  // quando dois aliases compartilham o mesmo rótulo, ex.: observacoes/observations).
  for (const [k, v] of Object.entries(FIELD_RENAMES)) m.set(v.toLowerCase(), k);
  for (const [k, v] of Object.entries(FIELD_LABELS)) {
    const lk = v.toLowerCase();
    if (!m.has(lk)) m.set(lk, k);
  }
  return m;
})();

/** True para campos internos/técnicos que não devem ser exportados/importados. */
export function isInternalField(key: string): boolean {
  const k = key.toLowerCase();
  if (INTERNAL_FIELD_KEYS.has(k)) return true;
  if (k.startsWith("_")) return true;                 // privados (_tipoOperacao etc.)
  if (/_at$/.test(k) || /At$/.test(key)) return true; // timestamps técnicos (created_at…)
  // Chaves estrangeiras internas (*_id), EXCETO as renomeadas para link.
  if ((/_id$/.test(k) || /Id$/.test(key)) && !FIELD_RENAMES[key]) return true;
  return false;
}

/**
 * Rótulo pt-BR EXPLÍCITO de um campo. SEM fallback visual: nunca gera label a
 * partir da chave técnica (humanizeKey/startCase). Quando o label não existe,
 * emite erro técnico controlado em desenvolvimento/teste e devolve um marcador
 * neutro (não-inglês) — o backend é a fonte única dos labels.
 */
export function fieldLabel(key: string): string {
  const explicit = FIELD_RENAMES[key] ?? FIELD_LABELS[key.toLowerCase()];
  if (explicit) return explicit;
  const meta = (import.meta as { env?: { DEV?: boolean; MODE?: string } }).env;
  if (meta?.DEV || meta?.MODE === "test") {
    // eslint-disable-next-line no-console
    console.error(`[i18n] Label pt-BR ausente para o campo: ${key}`);
  }
  return `⚠ ${key}`;
}

/** Mapeia um cabeçalho do arquivo de volta para a chave do campo (round-trip). */
export function keyForHeader(header: string): string {
  return KEY_FOR_LABEL.get(header.trim().toLowerCase()) ?? header.trim();
}

/**
 * Resolução de cabeçalho → chave do campo CIENTE DO MÓDULO destino.
 * Rótulos podem ser ambíguos globalmente (ex.: "Observações" = `notes` no CRM e
 * `observacoes` em artistas); preferimos o campo que existe no módulo destino.
 */
export function resolveImportKey(header: string, moduleKeys: string[] = []): string {
  const h = header.trim();
  const hl = h.toLowerCase();
  const inModule = moduleKeys.find((k) => fieldLabel(k).toLowerCase() === hl);
  if (inModule) return inModule;
  return KEY_FOR_LABEL.get(hl) ?? h;
}

/** Transforma o valor na EXPORTAÇÃO (ex.: id de streaming → link clicável). */
export function exportFieldValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined || value === "") return value;
  const s = String(value);
  if (key === "spotify_artist_id") return s.startsWith("http") ? s : `https://open.spotify.com/artist/${s}`;
  if (key === "youtube_channel_id") return s.startsWith("http") ? s : `https://www.youtube.com/channel/${s}`;
  return value;
}

/** Reverte o valor na IMPORTAÇÃO (link → id, quando aplicável). */
export function importFieldValue(key: string, value: unknown): unknown {
  if (typeof value !== "string" || value === "") return value;
  if (key === "spotify_artist_id") return value.replace(/^https?:\/\/open\.spotify\.com\/artist\//, "").trim();
  if (key === "youtube_channel_id") return value.replace(/^https?:\/\/(www\.)?youtube\.com\/channel\//, "").trim();
  return value;
}

/**
 * Deriva dinamicamente as colunas a partir dos registros (união de chaves,
 * preservando a ordem), EXCLUINDO campos internos/técnicos e aplicando os
 * rótulos pt-BR. Sem listas fixas — qualquer campo novo de formulário aparece.
 */
export function deriveColumns(records: Record<string, unknown>[]): ColumnDef[] {
  const seen = new Set<string>();
  const cols: ColumnDef[] = [];
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    for (const key of Object.keys(record)) {
      if (seen.has(key) || isInternalField(key)) continue;
      seen.add(key);
      cols.push({ key, label: fieldLabel(key) });
    }
  }
  return cols;
}

/** Serializa um valor de célula preservando a informação (objetos → JSON). */
export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Registry reativo: chama os hooks de dados de cada módulo (no topo, conforme as
 * regras de hooks) e devolve a lista de módulos exportáveis com registros reais.
 */
export function useExportRegistry(): ExportModule[] {
  const { artistas, addArtista } = useArtistas();
  const { obras, addObra } = useObras();
  const { fonogramas, addFonograma } = useFonogramas();
  const { contratos, addContrato } = useContratos();
  const { transacoes, addTransacao } = useTransacoes();
  const { notasFiscais, addNotaFiscal } = useNotasFiscais();
  const { projetos, addProjeto } = useProjetos();
  const { lancamentos, addLancamento } = useLancamentos();
  const { shares, addShare } = useShares();
  const { contacts, createContact } = useContacts();

  return useMemo(() => {
    const registry: ExportModule[] = [
      { key: "Artistas", records: asRecords(artistas), create: asCreate(addArtista as MutationLike) },
      { key: "Obras", records: asRecords(obras), create: asCreate(addObra as MutationLike) },
      { key: "Fonogramas", records: asRecords(fonogramas), create: asCreate(addFonograma as MutationLike) },
      { key: "Contratos", records: asRecords(contratos), create: asCreate(addContrato as MutationLike) },
      { key: "Transações Financeiras", records: asRecords(transacoes), create: asCreate(addTransacao as MutationLike) },
      { key: "Notas Fiscais", records: asRecords(notasFiscais), create: asCreate(addNotaFiscal as MutationLike) },
      { key: "Projetos", records: asRecords(projetos), create: asCreate(addProjeto as MutationLike) },
      { key: "Lançamentos", records: asRecords(lancamentos), create: asCreate(addLancamento as MutationLike) },
      { key: "Shares", records: asRecords(shares), create: asCreate(addShare as MutationLike) },
      {
        key: "Contatos (CRM)",
        records: asRecords(contacts),
        create: typeof createContact === "function"
          ? (record: Record<string, unknown>) => createContact(record as never)
          : undefined,
      },
    ];
    return registry;
  }, [
    artistas, obras, fonogramas, contratos, transacoes, notasFiscais, projetos, lancamentos, shares, contacts,
    addArtista, addObra, addFonograma, addContrato, addTransacao, addNotaFiscal, addProjeto, addLancamento, addShare, createContact,
  ]);
}
