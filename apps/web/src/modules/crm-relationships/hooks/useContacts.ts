import { useEffect, useMemo, useState } from "react";
import { contactsService } from "../services";
import type { Cliente, ClienteInsert, ClienteSegmento, ClienteUpdate, Contact } from "../types";

export type { Cliente, ClienteInsert, ClienteUpdate, ClienteSegmento, Contact };

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setContacts(await contactsService.list());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    contacts,
    isLoading,
    metrics: useMemo(() => ({
      total: contacts.length,
      strategic: contacts.filter((contact) => contact.priority === "strategic").length,
      active: contacts.filter((contact) => contact.status === "active" || contact.status === "favorite").length,
      withAttachments: contacts.filter((contact) => (contact.attachments?.length ?? 0) > 0).length,
    }), [contacts]),
    createContact: async (data: Parameters<typeof contactsService.create>[0]) => {
      const created = await contactsService.create(data);
      await refresh();
      return created;
    },
    updateContact: async (id: string, data: Partial<Contact>) => {
      await contactsService.update(id, data);
      await refresh();
    },
    deleteContact: async (id: string) => {
      await contactsService.remove(id);
      await refresh();
    },
    refetch: refresh,
  };
}

export function useSimpleContacts() {
  const { contacts, isLoading } = useContacts();

  return {
    contacts: useMemo(() => contacts.map((contact) => ({ id: contact.id, name: contact.name })), [contacts]),
    isLoading,
    error: null,
  };
}

export function useClientes() {
  const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts();
  const clientes: Cliente[] = contacts.map((contact) => ({
    id: contact.id,
    nome: contact.name,
    email: contact.email ?? null,
    telefone: contact.phone ?? contact.whatsapp ?? null,
    empresa: contact.companyName ?? null,
    cidade: contact.city ?? null,
    estado: contact.state ?? null,
    endereco: contact.address ?? null,
    status: contact.status,
    cpf: contact.documentType === "cpf" ? contact.documentNumber ?? null : null,
    cnpj: contact.documentType === "cnpj" ? contact.documentNumber ?? null : null,
    cpf_cnpj: contact.documentNumber ?? null,
    tipo_pessoa: contact.documentType === "cnpj" ? "juridica" : "fisica",
    responsavel: contact.responsible ?? null,
    observacoes: contact.notes ?? null,
    tipo: contact.contactType,
    segmento: "operational_contact",
  }));

  return {
    clientes,
    isLoading,
    error: null,
    addCliente: {
      mutate: (data: ClienteInsert, options?: { onSuccess?: () => void }) => void createContact(toContact(data)).then(options?.onSuccess),
      mutateAsync: (data: ClienteInsert) => createContact(toContact(data)),
    },
    updateCliente: {
      mutate: (data: ClienteUpdate & { id: string }, options?: { onSuccess?: () => void }) => void updateContact(data.id, toContactUpdate(data)).then(options?.onSuccess),
      mutateAsync: (data: ClienteUpdate & { id: string }) => updateContact(data.id, toContactUpdate(data)),
    },
    deleteCliente: {
      mutate: (id: string, options?: { onSuccess?: () => void }) => void deleteContact(id).then(options?.onSuccess),
      mutateAsync: (id: string) => deleteContact(id),
    },
  };
}

function toContact(data: ClienteInsert): Omit<Contact, "id" | "createdAt" | "updatedAt"> {
  return {
    name: data.nome,
    companyName: data.empresa ?? undefined,
    contactType: "COMPANY",
    documentType: data.cnpj ? "cnpj" : data.cpf ? "cpf" : data.cpf_cnpj ? "document" : undefined,
    documentNumber: data.cnpj ?? data.cpf ?? data.cpf_cnpj ?? undefined,
    phone: data.telefone ?? undefined,
    email: data.email ?? undefined,
    responsible: data.responsavel ?? undefined,
    notes: data.observacoes ?? undefined,
    address: data.endereco ?? undefined,
    city: data.cidade ?? undefined,
    state: data.estado ?? undefined,
    tags: [],
    status: "active",
    priority: "medium",
    payloadOperacional: {},
    attachments: [],
    timeline: [],
  };
}

function toContactUpdate(data: ClienteUpdate): Partial<Contact> {
  return {
    name: data.nome,
    companyName: data.empresa ?? undefined,
    documentType: data.cnpj ? "cnpj" : data.cpf ? "cpf" : data.cpf_cnpj ? "document" : undefined,
    documentNumber: data.cnpj ?? data.cpf ?? data.cpf_cnpj ?? undefined,
    phone: data.telefone ?? undefined,
    email: data.email ?? undefined,
    responsible: data.responsavel ?? undefined,
    notes: data.observacoes ?? undefined,
    address: data.endereco ?? undefined,
    city: data.cidade ?? undefined,
    state: data.estado ?? undefined,
  };
}
