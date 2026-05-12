/**
 * integrations/hooks/useNfe.ts
 *
 * Hook de configuração para emissão de NF-e (Nota Fiscal Eletrônica).
 * Cada empresa autentica com seu próprio certificado digital + credenciais SEFAZ.
 * Dados armazenados em localStorage (musicos360_ prefix).
 *
 * MIGRAÇÃO FUTURA:
 *   - Integração com SEFAZ via webservice (NF-e 4.0 + NFS-e)
 *   - Suporte a certificado A1 (PFX) e A3 (token/cartão)
 *   - Emissão, cancelamento, inutilização e consulta de status SEFAZ
 *   - DANFE em PDF via foco nfe / nfe.io / emites / plugnotas
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "musicos360_nfe_credentials";

export type NfeAmbiente = "producao" | "homologacao";
export type NfeCertificadoTipo = "A1" | "A3";

interface NfeCredentials {
  cnpj: string;
  ie?: string;
  regime_tributario: "simples_nacional" | "lucro_presumido" | "lucro_real";
  ambiente: NfeAmbiente;
  certificado_tipo: NfeCertificadoTipo;
  certificado_serial?: string;
  token_provedor?: string;
  provedor: "focusnfe" | "nfeio" | "emites" | "plugnotas" | "proprio";
  saved_at: string;
}

export interface NfeStatus {
  connected: boolean;
  has_credentials: boolean;
  cnpj?: string;
  ambiente?: NfeAmbiente;
  provedor?: string;
  certificado_tipo?: NfeCertificadoTipo;
  regime_tributario?: string;
  saved_at?: string;
}

function loadCredentials(): NfeCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useNfeStatus() {
  return useQuery<NfeStatus>({
    queryKey: ["integrations", "nfe", "status"],
    queryFn: (): NfeStatus => {
      const creds = loadCredentials();
      if (!creds) return { connected: false, has_credentials: false };
      return {
        connected: true,
        has_credentials: true,
        cnpj: creds.cnpj,
        ambiente: creds.ambiente,
        provedor: creds.provedor,
        certificado_tipo: creds.certificado_tipo,
        regime_tributario: creds.regime_tributario,
        saved_at: creds.saved_at,
      };
    },
    staleTime: 0,
  });
}

export function useNfeSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<NfeCredentials, "saved_at">) => {
      const creds: NfeCredentials = {
        ...payload,
        saved_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "nfe", "status"] });
    },
  });
}

export function useNfeDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem(STORAGE_KEY);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "nfe", "status"] });
    },
  });
}
