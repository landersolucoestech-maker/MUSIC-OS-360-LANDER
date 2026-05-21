import { useMemo } from "react";
import {
  computeNfRules,
  type NfFormRules,
  type TipoOperacaoNF,
} from "@/modules/accounting/components/nota-fiscal-form/rules/nf-form-rules";

export function useNfRules(tipoOperacao: TipoOperacaoNF): NfFormRules {
  return useMemo(() => computeNfRules(tipoOperacao), [tipoOperacao]);
}
