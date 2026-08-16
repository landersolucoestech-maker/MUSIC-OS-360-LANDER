import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Calendar, Clock, MapPin, User, Phone, Mail, Users, DollarSign, Tag, FileText, Pencil, Building2, CheckSquare } from "lucide-react";
import { formatCurrency, formatDate, getMonetarySemanticClass } from "@/shared/lib/format-utils";
import { normalizeAgendaParticipants, useAgendaParticipants } from "@/modules/events/hooks/useAgendaParticipants";
import { getBackendEventTypeLabel } from "@/modules/events/lib/event-type";

interface SchedulerViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: any;
  onEdit?: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmado": return <Badge variant="success">Confirmado</Badge>;
    case "agendado":
    case "pendente": return <Badge variant="warning">Pendente</Badge>;
    case "realizado":
    case "concluido": return <Badge variant="info">Realizado</Badge>;
    case "cancelado": return <Badge variant="danger">Cancelado</Badge>;
    default: return <Badge variant="neutral">{status || "—"}</Badge>;
  }
};

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground border-b border-border pb-2">
        <Icon className="h-4 w-4" />
        <span className=" tracking-wide text-xs">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

export function SchedulerViewModal({ open, onOpenChange, evento, onEdit }: SchedulerViewModalProps) {
  const { getArtistParticipantById } = useAgendaParticipants();

  if (!evento) return null;

  const artista = evento.artistas;
  const meta = (evento.metadata as Record<string, unknown> | undefined) ?? {};
  const storedParticipants = normalizeAgendaParticipants(meta["participants"]);
  const legacyArtistParticipant = getArtistParticipantById(evento.artista_id);
  const participants = storedParticipants.length > 0
    ? storedParticipants
    : legacyArtistParticipant
      ? [legacyArtistParticipant]
      : artista
        ? [{
            source: "artist" as const,
            id: String(artista.id ?? evento.artista_id ?? "legacy-artist"),
            label: String(artista.nome_artistico || artista.nome || "Artista"),
            email: artista.email ? String(artista.email) : undefined,
            phone: artista.telefone ? String(artista.telefone) : undefined,
            category: "Artista",
          }]
        : [];
  const checklist: Array<{ item: string; concluido: boolean }> = Array.isArray(evento.checklist) ? evento.checklist : [];
  const checklistDone = checklist.filter(c => c.concluido).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-[28px] bg-card ring-1 ring-border/10" data-testid="modal-evento-view">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/10">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-2xl font-semibold tracking-tight" data-testid="text-evento-titulo">{evento.titulo}</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                Detalhes completos do evento
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {getBackendEventTypeLabel(evento.tipo)}
                </Badge>
                {getStatusBadge(evento.status)}
              </div>
            </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 space-y-6 text-sm text-foreground">
          {/* DATA E HORÁRIO */}
          <Section title="Quando" icon={Calendar}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Data Início" value={formatDate(evento.data)} />
              <Field label="Horário Início" value={evento.data ? new Date(evento.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null} />
              <Field label="Data Fim" value={evento.data_fim ? formatDate(evento.data_fim) : null} />
              <Field label="Horário Fim" value={evento.data_fim ? new Date(evento.data_fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null} />
            </div>
          </Section>

          {/* LOCAL */}
          <Section title="Onde" icon={MapPin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Local" value={evento.local} />
              <Field label="Endereço" value={evento.endereco} />
            </div>
          </Section>

          {participants.length > 0 && (
            <Section title="Participantes do Evento" icon={User}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {participants.map((participant) => (
                  <Card key={`${participant.source}:${participant.id}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" data-testid="text-evento-artista">
                          {participant.label}
                        </p>
                        {participant.category && (
                          <p className="text-xs text-muted-foreground">{participant.category}</p>
                        )}
                      </div>
                      {(participant.email || participant.phone) && (
                        <div className="hidden sm:flex flex-col text-right text-xs text-muted-foreground">
                          {participant.email && <span>{participant.email}</span>}
                          {participant.phone && <span>{participant.phone}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* ARTISTA */}
          {artista && participants.length === 0 && (
            <Section title="Artista" icon={User}>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" data-testid="text-evento-artista">
                      {artista.nome_artistico || artista.nome || "—"}
                    </p>
                    {artista.genero_musical && (
                      <p className="text-xs text-muted-foreground">{artista.genero_musical}</p>
                    )}
                  </div>
                  {artista.email && (
                    <div className="hidden sm:flex flex-col text-right text-xs text-muted-foreground">
                      <span>{artista.email}</span>
                      {artista.telefone && <span>{artista.telefone}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Section>
          )}

          {/* CONTATO DO LOCAL */}
          {(evento.contato_local || evento.contato_telefone || evento.contato_email) && (
            <Section title="Contato no Local" icon={Phone}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field
                  label="Responsável"
                  value={evento.contato_local && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {evento.contato_local}
                    </span>
                  )}
                />
                <Field
                  label="Telefone"
                  value={evento.contato_telefone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {evento.contato_telefone}
                    </span>
                  )}
                />
                <Field
                  label="E-mail"
                  value={evento.contato_email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{evento.contato_email}</span>
                    </span>
                  )}
                />
              </div>
            </Section>
          )}

          {/* DETALHES OPERACIONAIS (Show) */}
          {(evento.valor_cache != null || evento.capacidade_publico != null || evento.publico_esperado != null) && (
            <Section title="Detalhes Operacionais" icon={DollarSign}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {evento.valor_cache != null && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Cachê</p>
                      <p className={`text-xl font-bold mt-1 ${getMonetarySemanticClass("neutral")}`} data-testid="text-evento-cache">
                        {formatCurrency(evento.valor_cache)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {evento.capacidade_publico != null && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Capacidade</p>
                      <p className="text-xl font-bold mt-1 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {Number(evento.capacidade_publico).toLocaleString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {evento.publico_esperado != null && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Público Esperado</p>
                      <p className="text-xl font-bold mt-1 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {Number(evento.publico_esperado).toLocaleString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </Section>
          )}

          {/* DESCRIÇÃO */}
          {evento.descricao && (
            <Section title="Descrição" icon={FileText}>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap" data-testid="text-evento-descricao">
                    {evento.descricao}
                  </p>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* CHECKLIST */}
          {checklist.length > 0 && (
            <Section title={`Checklist (${checklistDone}/${checklist.length})`} icon={CheckSquare}>
              <Card>
                <CardContent className="p-4 space-y-2">
                  {checklist.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={c.concluido} disabled className="pointer-events-none" />
                      <span className={c.concluido ? "line-through text-muted-foreground" : "text-foreground"}>
                        {c.item}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Section>
          )}

          {/* OBSERVAÇÕES */}
          {evento.observacoes && (
            <Section title="Observações" icon={FileText}>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evento.observacoes}</p>
                </CardContent>
              </Card>
            </Section>
          )}
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2 border-t border-border/20 px-6 pb-6 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-fechar-evento">
            Fechar
          </Button>
          {onEdit && (
            <Button onClick={onEdit} data-testid="button-editar-evento-view">
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
