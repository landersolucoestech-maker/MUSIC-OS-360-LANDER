import type { NfFormData } from "./nf-form-rules";

type SimpleReset = keyof NfFormData;

interface ConditionalReset {
  field: keyof NfFormData;
  value?: any;
  when?: (newValue: any) => boolean;
}

type ResetEntry = SimpleReset | ConditionalReset;

export const NF_RESET_MAP: Partial<Record<keyof NfFormData, ResetEntry[]>> = {
  tipo_nota: [
    {
      field: "codigo_servico_municipal",
      value: "12.07",
      when: (v) => v === "nfe" || v === "nfce",
    },
    {
      field: "cfop",
      value: "5933",
      when: (v) => v === "nfe" || v === "nfce",
    },
  ],
  cliente_id: ["tomador_cnpj", "tomador_razao_social", "tomador_email", "tomador_endereco", "tomador_cidade"],
  iss_retido: [],
};

export function applyResets(
  field: keyof NfFormData,
  newValue: any,
): Partial<NfFormData> {
  const entries = NF_RESET_MAP[field];
  if (!entries || entries.length === 0) return {};

  const resets: Partial<NfFormData> = {};
  for (const entry of entries) {
    if (typeof entry === "string") {
      (resets as any)[entry] = "";
    } else {
      const shouldReset = !entry.when || entry.when(newValue);
      if (shouldReset) {
        (resets as any)[entry.field] = entry.value ?? "";
      }
    }
  }
  return resets;
}
