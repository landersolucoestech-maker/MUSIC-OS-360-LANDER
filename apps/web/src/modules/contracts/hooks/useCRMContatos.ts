import { useClientes } from "@/modules/crm-relationships/hooks/useContacts";
import type { Cliente } from "@/modules/crm-relationships/types";

export interface CRMContato {
  id: string;
  nome: string;
  tipo: string;
  email?: string | null;
  telefone?: string | null;
  documento?: string | null;
}

const toContato = (c: Cliente): CRMContato => ({
  id: c.id,
  nome: c.nome,
  tipo: c.tipo ?? c.segmento ?? "contato",
  email: c.email,
  telefone: c.telefone,
  documento: c.cnpj ?? c.cpf ?? null,
});

export function useCRMContatos() {
  const { clientes, isLoading } = useClientes();

  const contatos: CRMContato[] = clientes.map(toContato);

  const clientes_crm = contatos.filter((c) => c.tipo === "cliente_ativo" || c.tipo === "contratante");
  const fornecedores = contatos.filter((c) => c.tipo === "fornecedor");
  const freelancers = contatos.filter((c) => c.tipo === "freelancer");
  const parceiros = contatos.filter((c) => c.tipo === "parceiro");
  const marcas = contatos.filter((c) => c.tipo === "marca");
  const creators = contatos.filter((c) => c.tipo === "creator" || c.tipo === "influenciador");
  const colaboradores = contatos.filter((c) => c.tipo === "colaborador");

  return {
    contatos,
    clientes_crm,
    fornecedores,
    freelancers,
    parceiros,
    marcas,
    creators,
    colaboradores,
    isLoading,
  };
}
