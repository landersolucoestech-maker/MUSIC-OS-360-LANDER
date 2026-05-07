import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export type TipoArtista =
  | "artista_solo"
  | "banda"
  | "dupla"
  | "trio"
  | "grupo"
  | "solo"
  | "";

export type StatusArtista =
  | "contratado"
  | "negociando"
  | "inativo"
  | "prospect";

export interface ArtistaFormValues {
  nome_artistico: string;
  nome_civil: string;
  tipo: string;
  status: string;
  genero_musical: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  foto_url: string;
  observacoes: string;
}

const GENEROS_MUSICAIS = [
  "Funk", "Forró", "Sertanejo", "Pop", "Rock", "MPB", "Eletrônica",
  "Hip Hop", "R&B", "Axé", "Pagode", "Gospel", "Reggae", "Jazz", "Outro",
];

interface ArtistaFormProps {
  mode?: "full";
  values: ArtistaFormValues;
  onChange: (field: keyof ArtistaFormValues, value: string) => void;
  errors?: Record<string, string>;
}

export function ArtistaForm({ values, onChange, errors = {} }: ArtistaFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Nome Artístico <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Nome usado profissionalmente"
            value={values.nome_artistico}
            onChange={(e) => onChange("nome_artistico", e.target.value)}
            data-testid="input-nome-artistico"
          />
          {errors.nome_artistico && (
            <p className="text-xs text-destructive">{errors.nome_artistico}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Nome Civil</Label>
          <Input
            placeholder="Nome completo (documentos)"
            value={values.nome_civil}
            onChange={(e) => onChange("nome_civil", e.target.value)}
            data-testid="input-nome-civil"
          />
          {errors.nome_civil && (
            <p className="text-xs text-destructive">{errors.nome_civil}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Tipo de Artista <span className="text-destructive">*</span>
          </Label>
          <Select
            value={values.tipo}
            onValueChange={(v) => onChange("tipo", v)}
          >
            <SelectTrigger data-testid="select-tipo">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="artista_solo">Artista Solo</SelectItem>
              <SelectItem value="solo">Solo</SelectItem>
              <SelectItem value="banda">Banda</SelectItem>
              <SelectItem value="dupla">Dupla</SelectItem>
              <SelectItem value="trio">Trio</SelectItem>
              <SelectItem value="grupo">Grupo</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipo && (
            <p className="text-xs text-destructive">{errors.tipo}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(v) => onChange("status", v)}
          >
            <SelectTrigger data-testid="select-status">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="contratado">Contratado</SelectItem>
              <SelectItem value="negociando">Negociando</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Gênero Musical</Label>
        <Select
          value={values.genero_musical}
          onValueChange={(v) => onChange("genero_musical", v)}
        >
          <SelectTrigger data-testid="select-genero">
            <SelectValue placeholder="Selecione o gênero" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50">
            {GENEROS_MUSICAIS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.genero_musical && (
          <p className="text-xs text-destructive">{errors.genero_musical}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            E-mail <span className="text-destructive">*</span>
          </Label>
          <Input
            type="email"
            placeholder="email@exemplo.com"
            value={values.email}
            onChange={(e) => onChange("email", e.target.value)}
            data-testid="input-email"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Telefone <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="(11) 99999-9999"
            value={values.telefone}
            onChange={(e) => onChange("telefone", e.target.value)}
            data-testid="input-telefone"
          />
          {errors.telefone && (
            <p className="text-xs text-destructive">{errors.telefone}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CPF / CNPJ</Label>
          <Input
            placeholder="000.000.000-00"
            value={values.cpf_cnpj}
            onChange={(e) => onChange("cpf_cnpj", e.target.value)}
            data-testid="input-cpf-cnpj"
          />
          {errors.cpf_cnpj && (
            <p className="text-xs text-destructive">{errors.cpf_cnpj}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>URL da Foto</Label>
          <Input
            placeholder="https://..."
            value={values.foto_url}
            onChange={(e) => onChange("foto_url", e.target.value)}
            data-testid="input-foto-url"
          />
          {errors.foto_url && (
            <p className="text-xs text-destructive">{errors.foto_url}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          placeholder="Notas adicionais sobre o artista..."
          rows={3}
          value={values.observacoes}
          onChange={(e) => onChange("observacoes", e.target.value)}
          data-testid="textarea-observacoes"
        />
        {errors.observacoes && (
          <p className="text-xs text-destructive">{errors.observacoes}</p>
        )}
      </div>
    </div>
  );
}
