import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { User } from "lucide-react";
import type { Artista } from "@/modules/artist/hooks/useArtistas";

interface ParticipanteViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artista: Artista | null;
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

const formatDateBR = (d?: string | null) => {
  if (!d) return null;
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
};

export function ParticipanteViewModal({
  open,
  onOpenChange,
  artista,
}: ParticipanteViewModalProps) {
  if (!artista) return null;

  const nome = artista.nome_civil || artista.nome || artista.nome_artistico;
  const pseudonimo = artista.nome_artistico;
  const tipoPessoa = artista.tipo_pessoa;
  const cpfCnpj = artista.cpf_cnpj;
  const dataNascimento = formatDateBR(artista.data_nascimento);
  const email = artista.email;
  const telefone = artista.telefone;
  const especialidades = Array.isArray(artista.especialidades)
    ? artista.especialidades.filter(Boolean).join(", ")
    : null;
  const generoMusical = artista.genero_musical;
  const website = artista.website;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary" />
            Visualizar Participante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar + nome */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{nome}</p>
              {pseudonimo && pseudonimo !== nome && (
                <p className="text-xs text-muted-foreground truncate">
                  {pseudonimo}
                </p>
              )}
            </div>
            {tipoPessoa && (
              <Badge variant="outline" className="text-xs shrink-0">
                {tipoPessoa}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Dados de Identificação */}
          <div>
            <SectionTitle>Identificação</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoField label="Nome *" value={nome} />
              <InfoField label="Pseudônimo" value={pseudonimo !== nome ? pseudonimo : null} />
              <InfoField label="Tipo de Pessoa" value={tipoPessoa} />
              <InfoField label="Data de Nascimento" value={dataNascimento} />
              <InfoField label="CPF / CNPJ" value={cpfCnpj} />
              {especialidades && (
                <InfoField label="Especialidades" value={especialidades} />
              )}
              {generoMusical && (
                <InfoField label="Gênero Musical" value={generoMusical} />
              )}
            </div>
          </div>

          {(email || telefone || website) && (
            <>
              <Separator />
              <div>
                <SectionTitle>Contato</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {email && <InfoField label="E-mail" value={email} />}
                  {telefone && <InfoField label="Telefone" value={telefone} />}
                  {website && <InfoField label="Website" value={website} />}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
