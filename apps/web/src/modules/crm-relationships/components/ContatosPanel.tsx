import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ContatosTable } from "./ContatosTable";
import { useContacts } from "../hooks/useContacts";
import { contatoPayloadToContactData } from "../services/contacts.service";
import { ContatoFormModal, type ContatoFormPayload } from "../modals/ContatoFormModal";
import { ContatoViewModal } from "../modals/ContatoViewModal";
import type { Contact, ContactType } from "../types";

// ─────────────────────────────────────────────
// Filtros rápidos por categoria
// ─────────────────────────────────────────────
type FiltroTipo =
  | "todos"
  | "clientes"
  | "parceiros"
  | "fornecedores"
  | "contratantes"
  | "prestadores";

const FILTROS: ReadonlyArray<{ value: FiltroTipo; label: string; types: ContactType[] }> = [
  { value: "todos",        label: "Todos",        types: [] },
  { value: "clientes",     label: "Clientes",     types: ["CORPORATE_CLIENT"] },
  { value: "parceiros",    label: "Parceiros",    types: ["PARTNER"] },
  { value: "fornecedores", label: "Fornecedores", types: ["SUPPLIER"] },
  // ✅ "BRAND" removido — não existe em ContactType
  { value: "contratantes", label: "Contratantes", types: ["CORPORATE_CLIENT"] },
  { value: "prestadores",  label: "Prestadores",  types: ["SERVICE_PROVIDER"] },
];

// ─────────────────────────────────────────────
// Converte Contact → ContatoFormPayload inicial
// para preencher o modal de edição
// ─────────────────────────────────────────────
function contactToFormPayload(contact: Contact): Partial<ContatoFormPayload> {
  const po = (contact.payloadOperacional ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof po[k] === "string" ? (po[k] as string) : "");

  // Normaliza tipo_pessoa: aceita todos os formatos legados e sempre devolve
  // "pessoa_fisica" | "pessoa_juridica" — que é o único valor que ContatoFormModal entende.
  const rawTipo = str("tipo_pessoa");
  const tipoPessoa: "pessoa_fisica" | "pessoa_juridica" =
    rawTipo === "pessoa_juridica" ||
    rawTipo === "COMPANY" ||
    (contact as Record<string, unknown>)["entityType"] === "COMPANY"
      ? "pessoa_juridica"
      : "pessoa_fisica";

  const isIndividual = tipoPessoa === "pessoa_fisica";

  return {
    // Entidade
    tipo_pessoa: tipoPessoa, // sempre "pessoa_fisica" | "pessoa_juridica"

    // Pessoa Física
    nome_pf:           isIndividual ? contact.name : "",
    cpf:               str("cpf"),
    funcao:            str("funcao"),
    foto:              str("foto"),

    // Pessoa Jurídica
    razao_social:      !isIndividual ? contact.name : "",
    nome_fantasia:     str("nome_fantasia"),
    cnpj:              str("cnpj"),

    // Classificação hierárquica
    categoria:         contact.contactType ?? "",
    perfil:            str("perfil"),
    instagram:         contact.instagram ?? "",
    email:             contact.email ?? "",
    telefone:          contact.whatsapp ?? contact.phone ?? "",

    // Endereço
    cep:               str("cep") || contact.zipCode || "",
    logradouro:        str("logradouro"),
    numero:            str("numero"),
    complemento:       str("complemento"),
    bairro:            str("bairro"),
    cidade:            contact.city ?? "",
    estado:            contact.state ?? "",

    // Classificação
    status_contato:    contact.status ?? "active",
    prioridade_contato: contact.priority ?? "medium",

    // Responsável
    responsavel_nome:     str("responsavel_nome") || contact.responsible || "",
    responsavel_email:    str("responsavel_email"),
    responsavel_telefone: str("responsavel_telefone"),
    // lê responsavel_cargo (campo atual) com fallback para cargo_responsavel (campo legado)
    responsavel_cargo:    str("responsavel_cargo") || str("cargo_responsavel"),

    // Histórico
    interacoes: Array.isArray(po.interacoes) ? (po.interacoes as never[]) : [],
    attachments: contact.attachments ?? [],

    // Observações
    observacoes: contact.notes ?? "",

    // Aliases legados
    nome:              contact.name,
    cpf_cnpj:          contact.documentNumber ?? "",
    endereco_completo: contact.address ?? "",
    responsavel:       contact.responsible ?? "",
  };
}

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────
export type ContatosPanelHandle = {
  openCreate: () => void;
};

export const ContatosPanel = forwardRef<ContatosPanelHandle, Record<string, never>>(
  function ContatosPanel(_, ref) {
    const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts();

    const [filtro, setFiltro]         = useState<FiltroTipo>("todos");
    const [search, setSearch]         = useState("");
    const [viewContact, setViewContact] = useState<Contact | null>(null);
    const [editContact, setEditContact] = useState<Contact | null>(null);
    const [formOpen, setFormOpen]       = useState(false);

    // ── Filtro ──────────────────────────────────
    const filtered = useMemo(() => {
      const cfg  = FILTROS.find((f) => f.value === filtro)!;
      const term = search.trim().toLowerCase();
      return contacts.filter((c) => {
        if (cfg.types.length > 0 && !cfg.types.includes(c.contactType)) return false;
        if (!term) return true;
        const haystack = [c.name, c.companyName, c.email, c.phone, c.whatsapp, c.city]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }, [contacts, filtro, search]);

    // ── Handlers ────────────────────────────────
    function handleView(contact: Contact) {
      setViewContact(contact);
    }

    function handleEdit(contact: Contact) {
      setEditContact(contact);
      setFormOpen(true);
    }

    async function handleDelete(contact: Contact) {
      await deleteContact(contact.id);
    }

    async function handleFormSubmit(payload: ContatoFormPayload) {
      const data = contatoPayloadToContactData(payload);

      if (editContact) {
        await updateContact(editContact.id, data);
      } else {
        await createContact(data);
      }
    }

    useImperativeHandle(ref, () => ({
      openCreate: () => {
        setEditContact(null);
        setFormOpen(true);
      },
    }));

    return (
      <div className="space-y-5" data-testid="contatos-panel">
        {/* Barra de busca + filtro */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-lg bg-muted/30 p-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa, email, telefone ou cidade"
            className="h-8 flex-1 text-sm"
            data-testid="contatos-search"
          />
          <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroTipo)}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm" data-testid="contatos-filtro-tipo">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              {FILTROS.map((f) => (
                <SelectItem key={f.value} value={f.value} data-testid={`filtro-${f.value}`}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando contatos...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm italic text-muted-foreground" data-testid="contatos-empty">
            Nenhum contato encontrado.
          </p>
        ) : (
          <ContatosTable
            contacts={filtered}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={(rows) => rows.forEach((c) => void deleteContact(c.id))}
          />
        )}

        {/* Modal de visualização */}
        <ContatoViewModal
          open={viewContact !== null}
          onOpenChange={(next) => { if (!next) setViewContact(null); }}
          contact={viewContact}
          onEdit={(contact) => {
            setViewContact(null);
            setTimeout(() => { handleEdit(contact); }, 50);
          }}
        />

        {/* Modal de criação / edição */}
        <ContatoFormModal
          open={formOpen}
          mode={editContact ? "edit" : "create"}
          initialValue={editContact ? contactToFormPayload(editContact) : null}
          onOpenChange={(next) => {
            setFormOpen(next);
            if (!next) setEditContact(null);
          }}
          onSubmit={handleFormSubmit}
        />
      </div>
    );
  }
);
