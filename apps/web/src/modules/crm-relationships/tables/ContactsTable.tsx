import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { contactPriorityOptions, contactStatusOptions, contactTypeOptions, labelFor } from "../constants";
import type { Contact } from "../types";

export function ContactsTable({
  contacts,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  contacts: Contact[];
  selectedId?: string | null;
  onSelect: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <ListSectionHeader
        title="Lista de Contatos"
        count={contacts.length}
        description="Acompanhe contatos, tipos, status, prioridades e responsáveis"
        className="px-4 pt-4"
      />
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead>Contato</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className={selectedId === contact.id ? "bg-primary/10" : ""}>
              <TableCell>
                <button type="button" onClick={() => onSelect(contact)} className="text-left">
                  <p className="font-medium text-foreground">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.companyName ?? contact.email ?? contact.whatsapp ?? "-"}</p>
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">{labelFor(contactTypeOptions, contact.contactType)}</TableCell>
              <TableCell className="text-muted-foreground">{labelFor(contactStatusOptions, contact.status)}</TableCell>
              <TableCell className="text-muted-foreground">{labelFor(contactPriorityOptions, contact.priority)}</TableCell>
              <TableCell className="text-muted-foreground">{[contact.city, contact.state].filter(Boolean).join(" / ") || "-"}</TableCell>
              <TableCell className="text-muted-foreground">{contact.tags.slice(0, 3).join(", ") || "-"}</TableCell>
              <TableCell className="text-muted-foreground">{contact.responsible ?? "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" title="Detalhes" onClick={() => onSelect(contact)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => onEdit(contact)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Excluir" onClick={() => onDelete(contact)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {contacts.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div> : null}
    </div>
  );
}
