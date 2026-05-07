import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { Artista } from "@/modules/artist/hooks/useArtistas";

interface ParticipanteViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artista: Artista | null;
}

const formatDateBR = (d?: string | null) => {
  if (!d) return "";
  try {
    // Pega só a parte YYYY-MM-DD para evitar problemas de timezone
    const datePart = d.split("T")[0];
    const [year, month, day] = datePart.split("-");
    if (!year || !month || !day) return d;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
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

  const nomeCivil = artista.nome_civil || artista.nome || artista.nome_artistico || "";
  const pseudonimo = artista.nome_artistico || "";
  const tipoPessoa = (artista.tipo_pessoa as string | null | undefined) ?? "";
  const genero = (artista as Record<string, unknown>).genero as string | null | undefined;
  const generoVal = genero ?? "";
  const dataNascimento = formatDateBR(artista.data_nascimento);
  const cpfCnpj = artista.cpf_cnpj || "";
  const cae = ((artista as Record<string, unknown>).cae as string | null | undefined) ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border" data-testid="modal-participante-view">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            Visualizar Participante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <Label className="text-xs text-foreground">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              value={nomeCivil}
              readOnly
              className="bg-muted/30 text-sm"
              data-testid="input-participante-nome"
            />
          </div>

          {/* Row: Pseudônimo | Tipo de Pessoa | Gênero */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pseudônimo</Label>
              <Input
                value={pseudonimo}
                readOnly
                className="bg-muted/30 text-sm"
                data-testid="input-participante-pseudonimo"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo de Pessoa</Label>
              <Select value={tipoPessoa} disabled>
                <SelectTrigger className="bg-muted/30 text-sm h-9" data-testid="select-participante-tipo-pessoa">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Física">Física</SelectItem>
                  <SelectItem value="Jurídica">Jurídica</SelectItem>
                  <SelectItem value="fisica">Física</SelectItem>
                  <SelectItem value="juridica">Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Gênero</Label>
              <Select value={generoVal} disabled>
                <SelectTrigger className="bg-muted/30 text-sm h-9" data-testid="select-participante-genero">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Data de Nascimento | CPF/CNPJ | CAE */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
              <Input
                value={dataNascimento}
                readOnly
                className="bg-muted/30 text-sm"
                data-testid="input-participante-data-nascimento"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">CPF / CNPJ</Label>
              <Input
                value={cpfCnpj}
                readOnly
                className="bg-muted/30 text-sm"
                data-testid="input-participante-cpf-cnpj"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">CAE</Label>
              <Input
                value={cae}
                readOnly
                className="bg-muted/30 text-sm"
                data-testid="input-participante-cae"
              />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">* Campo obrigatório</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
