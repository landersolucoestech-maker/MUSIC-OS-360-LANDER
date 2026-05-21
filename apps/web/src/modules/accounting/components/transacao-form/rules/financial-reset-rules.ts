import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";

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
    "motivoViagem",
    "nomePublicidade",
    "orgaoArrecadador",
  ],
  tipoCliente: [
    "categoria",
    "subcategoria",
    "artistaVinculado",
    "projetoVinculado",
    "contratoVinculado",
    "eventoVinculado",
    "motivoViagem",
    "nomePublicidade",
  ],
  categoria: [
    "subcategoria",
    "itemInvestimento",
    "artistaVinculado",
    "projetoVinculado",
    "contratoVinculado",
    "eventoVinculado",
    "motivoViagem",
    "nomePublicidade",
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
  for (const entry of entries) {
    if (typeof entry === "string") {
      resets[entry] = "";
    } else {
      const shouldReset = !entry.when || entry.when(newValue);
      if (shouldReset) {
        resets[entry.field] = entry.value ?? "";
      }
    }
  }
  return resets;
}
