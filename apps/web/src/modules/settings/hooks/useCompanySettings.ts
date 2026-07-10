import { useQuery } from "@tanstack/react-query";
import { IS_PROD } from "@/shared/lib/env";

export interface CompanySettings {
  id: string;
  user_id: string;
  org_id: string;
  company_name: string | null;
  fantasy_name: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal?: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
}

export function useCompanySettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["company_settings"],
    // Backend não expõe ainda um endpoint real de dados cadastrais da empresa
    // (CNPJ/razão social/endereço). Em produção, retornar null em vez de dados
    // fictícios — a Nota Fiscal deve exibir campos vazios para preenchimento
    // manual, nunca um CNPJ inventado.
    queryFn: async () => null as CompanySettings | null,
  });

  return { companySettings: data, isLoading, error };
}
