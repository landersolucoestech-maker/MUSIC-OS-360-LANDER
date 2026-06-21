import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import type { FinancialFormRules } from "./financial-form-rules";

type SimpleReset = keyof TransacaoFormData;

interface ConditionalReset {
  field:  keyof TransacaoFormData;
  value?: string;
  when?:  (newValue: string) => boolean;
}

type ResetEntry = SimpleReset | ConditionalReset;

export const RESET_MAP: Partial<Record<keyof TransacaoFormData, ResetEntry[]>> = {
  tipoTransacao: [
    {
      field: "tipoCliente",
      when: (v) => ["imposto", "transferencia", "investimento"].includes(v),
    },
    "categoria",
    "subcategoria",
    "itemInvestimento",
    "artistaVinculado",
    "projetoVinculado",
    "contratoVinculado",
    "eventoVinculado",
    "tipoVinculacao",
    "motivoViagem",
    "nomePublicidade",
    "orgaoArrecadador",
    "centroCusto",
    "competencia",
    "contaOrigem",
    "contaDestino",
  ],
  tipoCliente: [
    "categoria",
    "subcategoria",
    "artistaVinculado",
    "projetoVinculado",
    "contratoVinculado",
    "eventoVinculado",
    "tipoVinculacao",
    "motivoViagem",
    "nomePublicidade",
    "centroCusto",
    "competencia",
    "contaOrigem",
    "contaDestino",
  ],
  categoria: [
    "subcategoria",
    "itemInvestimento",
    "artistaVinculado",
    "projetoVinculado",
    "contratoVinculado",
    "eventoVinculado",
    "tipoVinculacao",
    "motivoViagem",
    "nomePublicidade",
    "orgaoArrecadador",
    "centroCusto",
    "competencia",
    "contaOrigem",
    "contaDestino",
  ],
  subcategoria: [
    "artistaVinculado",
    "projetoVinculado",
    "contratoVinculado",
    "eventoVinculado",
    "fornecedorCliente",
    "orgaoArrecadador",
    "tipoVinculacao",
    "centroCusto",
    "competencia",
    "contaOrigem",
    "contaDestino",
  ],
  tipoVinculacao: [
    "artistaVinculado",
    "projetoVinculado",
    "contratoVinculado",
    "eventoVinculado",
    "fornecedorCliente",
    "orgaoArrecadador",
    "centroCusto",
    "competencia",
    "contaOrigem",
    "contaDestino",
  ],
  artistaVinculado: [
    "projetoVinculado",
    "eventoVinculado",
    "contratoVinculado",
  ],
  tipoPagamento: [
    { field: "quantidadeParcelas",  when: (v) => v === "avista" },
    { field: "intervaloParcelas",   value: "mensal", when: (v) => v === "avista" },
    { field: "dataPrimeiraParcela", when: (v) => v === "avista" },
  ],
};

export function applyResets(
  field:    keyof TransacaoFormData,
  newValue: string,
): Partial<TransacaoFormData> {
  const entries = RESET_MAP[field];
  if (!entries) return {};

  const resets: Partial<TransacaoFormData> = {};
  const write = resets as Record<string, string>;
  for (const entry of entries) {
    if (typeof entry === "string") {
      write[entry] = "";
    } else {
      const shouldReset = !entry.when || entry.when(newValue);
      if (shouldReset) {
        write[entry.field] = entry.value ?? "";
      }
    }
  }
  return resets;
}

const HIDDEN_FIELD_RULES: Partial<Record<keyof FinancialFormRules, (keyof TransacaoFormData)[]>> = {
  exibirItemInvestimento: ["itemInvestimento"],
  exibirArtista: ["artistaVinculado"],
  exibirProjeto: ["projetoVinculado"],
  exibirEvento: ["eventoVinculado"],
  exibirFornecedor: ["fornecedorCliente"],
  exibirOrgaoArrecadador: ["orgaoArrecadador"],
  exibirMotivoViagem: ["motivoViagem"],
  exibirNomePublicidade: ["nomePublicidade"],
  exibirParcelamento: ["quantidadeParcelas", "intervaloParcelas", "dataPrimeiraParcela"],
};

function getResetValue(field: keyof TransacaoFormData): string {
  return field === "intervaloParcelas" ? "mensal" : "";
}

export function getHiddenFieldResets(
  formData: TransacaoFormData,
  rules: FinancialFormRules,
): {
  values: Partial<TransacaoFormData>;
  fields: (keyof TransacaoFormData)[];
} {
  const values: Partial<TransacaoFormData> = {};
  const fields: (keyof TransacaoFormData)[] = [];

  for (const [ruleKey, relatedFields] of Object.entries(HIDDEN_FIELD_RULES) as [
    keyof FinancialFormRules,
    (keyof TransacaoFormData)[],
  ][]) {
    if (rules[ruleKey] !== false) continue;

    for (const field of relatedFields) {
      if (field === "artistaVinculado" && formData.tipoVinculacao === "artista") continue;
      if (field === "projetoVinculado" && formData.tipoVinculacao === "projeto") continue;
      if (field === "fornecedorCliente" && formData.tipoVinculacao === "empresa") continue;

      const resetValue = getResetValue(field);
      if (formData[field] !== resetValue) {
        (values as Record<string, string>)[field] = resetValue;
        fields.push(field);
      }
    }
  }

  return { values, fields };
}

export function clearFieldsFromErrors<T extends Partial<Record<keyof TransacaoFormData, string>>>(
  errors: T,
  fields: (keyof TransacaoFormData)[],
): T {
  if (fields.length === 0) return errors;

  const next = { ...errors };
  for (const field of fields) {
    delete next[field];
  }
  return next;
}

