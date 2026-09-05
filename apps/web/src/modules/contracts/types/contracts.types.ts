import type { ArtistaRef, ClienteRef } from "@/shared/types/refs";
import type { ContratoStatus, ContratoTipo } from "@/shared/types/enums";
import type { ContratoSigner } from "@/modules/contracts/lib/contrato-schema";
import type { UploadedFile } from "@/shared/components/FileUpload";

export type { ContratoStatus, ContratoTipo };

export interface ContratoVersao {
  versao: string;
  url: string;
  criado_em: string;
  notas?: string;
  autor?: string;
}

export type SigningPlatform = "autentique" | "clicksign" | "docusign";

/**
 * Signer record persisted by ContratoWizard.
 * Richer than the legacy ContratoSigner — keeps wizard-specific fields
 * (nome, obrigatorio, ordem, provider) alongside the canonical email + role.
 */
export interface WizardSignerRecord {
  /** Canonical display name — mirrors ContratoSigner.name for consumer compatibility */
  name: string;
  nome: string;
  email: string;
  role: string;
  obrigatorio: boolean;
  ordem: number;
  provider: string;
}

export interface Contrato {
  id: string;
  user_id?: string;
  titulo: string;
  tipo?: ContratoTipo | string | null;
  status?: ContratoStatus | string | null;
  artist_id?: string | null;
  client_id?: string | null;
  release_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor?: number | null;
  exclusivo?: boolean | null;
  observacoes?: string | null;
  template_id?: string | null;
  assinado_em?: string | null;
  arquivo_url?: string | null;
  autentique_doc_id?: string | null;
  signing_platform?: SigningPlatform | null;
  versoes?: ContratoVersao[];
  signers?: Array<ContratoSigner | WizardSignerRecord>;
  documentos?: UploadedFile[];
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ContratoInsert = Omit<Contrato, "id" | "user_id" | "created_at" | "updated_at">;
export type ContratoUpdate = Partial<ContratoInsert>;

export interface ContratoWithRelations extends Contrato {
  artistas?: ArtistaRef | null;
  clientes?: ClienteRef | null;
}

export interface TemplateContrato {
  id: string;
  user_id?: string | null;
  nome: string;
  tipo_servico: string;
  conteudo: string;
  descricao?: string | null;
  ativo: boolean;
  variables_manifest?: string | null;
  header_image?: string | null;
  footer_image?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type TemplateContratoInsert = Omit<TemplateContrato, "id" | "user_id" | "created_at" | "updated_at">;
export type TemplateContratoUpdate = Partial<TemplateContratoInsert>;

// ─── Contract Template Engine Types ──────────────────────────────────────────

export type ParticipantRole =
  | "CONTRATANTE"
  | "CONTRATADO"
  | "ARTISTA"
  | "PRODUTOR"
  | "EMPRESA"
  | "LABEL"
  | "EMPRESARIO"
  | "COMPOSITOR"
  | "TESTEMUNHA"
  | "REPRESENTANTE_LEGAL";

export type EntityType = "pessoa_fisica" | "pessoa_juridica";

export type VariableCategory =
  | "participantes"
  | "financeiro"
  | "obra_musical"
  | "vigencia"
  | "assinatura"
  | "sistema"
  | "personalizada";

export type VariableType = "text" | "textarea" | "number" | "date" | "percentage" | "currency" | "boolean" | "select";

export interface ContractVariable {
  id: string;
  key: string;
  label: string;
  description?: string;
  type: VariableType;
  source: "participant" | "financial" | "work" | "system" | "custom";
  category: VariableCategory;
  required: boolean;
  example: string;
  options?: string[];
  participantReference?: string;
}

export interface Participant {
  id: string;
  role: ParticipantRole;
  entityType: EntityType;
  label?: string;
  variables: ContractVariable[];
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  variablesUsed: string[];
  category?: string;
  order: number;
  required: boolean;
  editable: boolean;
  aiGenerated: boolean;
}

export interface FinancialSettings {
  externalRightsTermsEnabled: boolean;
  fixedValueEnabled: boolean;
  advanceEnabled: boolean;
  supportEnabled: boolean;
  allowInstallments: boolean;
  currency: string;
  paymentFrequency: "unico" | "mensal" | "trimestral" | "anual";
  penaltyPercentage: number | null;
  interestPercentage: number | null;
  defaultDueDays: number | null;
  defaultFinancialCategory: string | null;
}

export interface MusicWork {
  title: string;
  isrc: string;
  upc: string;
  genre: string;
  language: string;
  releaseDate: string;
  platforms: string[];
  distributionType: "exclusiva" | "nao_exclusiva" | "licenca" | "";
}

export interface SignatureSettings {
  enabled: boolean;
  signatureOrder: string[];
  requireWitnesses: boolean;
  provider: "autentique" | "docusign" | "";
  auditTrail: boolean;
}

export interface BrandingSettings {
  headerImageUrl: string | null;
  footerImageUrl: string | null;
  logoUrl: string | null;
  watermarkEnabled: boolean;
  watermarkText: string;
  textAlignment: "left" | "center" | "justify";
  fontFamily: string;
  pageNumbers: boolean;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

// ─── Semantic Contract Intelligence Engine Types ──────────────────────────────

export type SemanticClauseType = string;

export interface SemanticVariable {
  id: string;
  originalText: string;
  context: string;
  inferredEntity: string;
  placeholder: string;
  accepted: boolean;
  source?: "ai" | "manual";
}

export interface SemanticParseResult {
  variables: SemanticVariable[];
  clauseTypes: SemanticClauseType[];
  rawText: string;
}

export interface SemanticTemplateManifest {
  variables: SemanticVariable[];
  clauseTypes: SemanticClauseType[];
  generatedAt: string;
}

/**
 * ContractTemplate — a fully-resolved contract type with all engine data.
 * Represents a ContractServiceType enriched with participant variables,
 * clauses, financial configuration, music work, signatures, and branding.
 * Compatible with ContractServiceType (subset/alias used at creation time).
 */
export interface ContractTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  clientTypes: string[];
  active: boolean;
  sortOrder: number;
  participants: Participant[];
  variables: ContractVariable[];
  clauses: ContractClause[];
  financial: FinancialSettings;
  musicWork: MusicWork;
  signature: SignatureSettings;
  branding: BrandingSettings;
  conteudo: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Converts a ContractServiceType (storage model) to ContractTemplate (domain model).
 * Provides the canonical mapping between the flat storage row and the rich domain object.
 */
export type ContractTemplateSubset = Pick<
  ContractTemplate,
  "id" | "name" | "slug" | "description" | "category" | "active" | "participants" | "variables"
>;

