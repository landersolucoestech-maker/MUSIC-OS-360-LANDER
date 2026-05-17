import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contractsService } from "@/modules/contracts/services/contracts.service";

export type ClientType = "artista" | "pessoa_fisica" | "pessoa_juridica";
export type FinancialModel = "valor_fixo" | "royalties" | "misto" | "recorrente";

export interface ContractServiceType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  client_types: ClientType[];
  financial_model: FinancialModel;
  requires_royalties: boolean;
  requires_fixed_value: boolean;
  requires_advance: boolean;
  requires_financial_support: boolean;
  allow_payment_type_select: boolean;
  default_financial_category: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ContractServiceTypeInsert = Omit<ContractServiceType, "id" | "created_at" | "updated_at">;
export type ContractServiceTypeUpdate = Partial<ContractServiceTypeInsert> & { id: string };

const QUERY_KEY = ["contract_service_types"] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function useContractServiceTypes(filterByClientType?: ClientType | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const rows = await contractsService.listContractServiceTypes();
      return (rows as unknown as ContractServiceType[]).sort((a, b) => a.sort_order - b.sort_order);
    },
  });

  const allTypes: ContractServiceType[] = query.data ?? [];

  const activeTypes = allTypes.filter((t) => t.active);

  const filteredTypes = filterByClientType
    ? activeTypes.filter((t) => t.client_types.includes(filterByClientType))
    : activeTypes;

  const createMutation = useMutation({
    mutationFn: async (data: ContractServiceTypeInsert) => {
      const all = allTypes;
      const slug = slugify(data.name);
      if (all.some((t) => t.slug === slug && t.id !== (data as ContractServiceType).id)) {
        throw new Error(`Já existe um tipo com o slug "${slug}"`);
      }
      return contractsService.createContractServiceType({
        ...data,
        slug,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Tipo de contrato criado com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao criar tipo de contrato");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: ContractServiceTypeUpdate) => {
      const all = allTypes;
      if (data.name) {
        const slug = slugify(data.name);
        if (all.some((t) => t.slug === slug && t.id !== id)) {
          throw new Error(`Já existe um tipo com o slug "${slug}"`);
        }
        data.slug = slug as string;
      }
      return contractsService.updateContractServiceType(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Tipo de contrato atualizado com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao atualizar tipo de contrato");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => contractsService.archiveContractServiceType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Tipo de contrato arquivado.");
    },
    onError: () => {
      toast.error("Erro ao arquivar tipo de contrato");
    },
  });

  function getTypeBySlug(slug: string): ContractServiceType | undefined {
    return allTypes.find((t) => t.slug === slug);
  }

  function isSlugInUse(slug: string, contratos: Array<Record<string, unknown>>): boolean {
    return contratos.some((c) => c.service_type === slug || c.tipo === slug);
  }

  return {
    serviceTypes: filteredTypes,
    allServiceTypes: allTypes,
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation,
    update: updateMutation,
    archive: archiveMutation,
    getTypeBySlug,
    isSlugInUse,
    slugify,
  };
}
