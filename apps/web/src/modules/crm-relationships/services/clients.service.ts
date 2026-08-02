/**
 * services/clients.service.ts
 *
 * Cliente real do backend `/clients` (tabela `clients`, ClientsController/
 * ClientsService — apps/api/src/modules/clients). Fonte de verdade para o
 * dropdown "cliente" usado em contratos, agenda, financeiro, nota fiscal e
 * dashboard (ver useClientes() em ../hooks/useContacts.ts).
 *
 * Substitui a implementação anterior de useClientes(), que — apesar do nome —
 * lia a tabela `contacts` (via useContacts()), nunca a tabela `clients` real.
 */
import { api } from "@/shared/lib/api-client";

export interface ApiClient {
  id: string;
  tenant_id: string;
  tipo_pessoa: string;
  categoria: string;
  perfil: string;
  nome: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  nome_pf: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  instagram: string | null;
  endereco_completo: string | null;
  status: string;
  observacoes: string | null;
  responsavel_nome: string | null;
  attachments: unknown[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Aliases amigáveis já resolvidos pelo backend (ClientsService.mapClient).
  name: string;
  type: string;
  category: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
}

export interface CreateApiClientInput {
  name: string;
  type?: "person" | "company";
  category?: string;
  email?: string;
  phone?: string;
  document?: string;
  address?: Record<string, unknown> | string;
  metadata?: Record<string, unknown>;
  city?: string;
  state?: string;
  instagram?: string;
  zipCode?: string;
  responsible?: string;
  notes?: string;
}

export type UpdateApiClientInput = Partial<CreateApiClientInput> & {
  status?: "active" | "inactive" | "blocked";
};

export interface ListApiClientsResult {
  data: ApiClient[];
  meta: { total: number; offset: number; limit: number };
}

export const clientsService = {
  async list(params?: { search?: string; status?: string; category?: string; limit?: number; offset?: number }): Promise<ApiClient[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    const result = await api.get<ListApiClientsResult>(`/clients${qs ? `?${qs}` : ""}`);
    return result.data;
  },
  async create(data: CreateApiClientInput): Promise<ApiClient> {
    return api.post<ApiClient>("/clients", data);
  },
  async update(id: string, data: UpdateApiClientInput): Promise<ApiClient> {
    return api.patch<ApiClient>(`/clients/${id}`, data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  },
};
