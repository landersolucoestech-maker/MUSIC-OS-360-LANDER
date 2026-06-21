import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { orgaosArrecadadores } from "@/modules/accounting/lib/transacao-constants";
import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import type { FinancialRulesResult } from "@/modules/accounting/components/transacao-form/hooks/useFinancialRules";
import type { ValidationErrors } from "@/modules/accounting/components/transacao-form/validation/financial-form-validation";
import { FormSelectField } from "@/modules/accounting/components/transacao-form/components/FormSelectField";
import { FormInputField } from "@/modules/accounting/components/transacao-form/components/FormInputField";

interface Artista { id: string; nome_artistico: string }
interface Projeto { id: string; titulo: string }
interface Evento  { id: string; titulo: string; data_inicio?: string | null }
interface Cliente { id: string; nome: string }

interface FinancialLinksSectionProps {
  formData:    TransacaoFormData;
  rules:       FinancialRulesResult;
  errors:      ValidationErrors;
  disabled:    boolean;
  updateField: (field: keyof TransacaoFormData, value: string) => void;
  artistas:    Artista[];
  clientes:    Cliente[];
  projetosFiltrados: Projeto[];
  eventosFiltrados:  Evento[];
}

export function FinancialLinksSection({
  formData,
  rules,
  errors,
  disabled,
  updateField,
  artistas,
  clientes,
  projetosFiltrados,
  eventosFiltrados,
}: FinancialLinksSectionProps) {
  const hasAnyLink =
    rules.exibirArtista      ||
    rules.exibirProjeto      ||
    rules.exibirEvento       ||
    rules.exibirFornecedor   ||
    rules.exibirOrgaoArrecadador ||
    rules.exibirMotivoViagem ||
    rules.exibirNomePublicidade;

  if (!hasAnyLink) return null;

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Vinculações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.exibirOrgaoArrecadador && (
            <FormSelectField
              label="Órgão Arrecadador"
              value={formData.orgaoArrecadador}
              onChange={(v) => updateField("orgaoArrecadador", v)}
              options={orgaosArrecadadores.map(o => ({ value: o.id, label: o.nome }))}
              placeholder="Ex: Receita Federal, Prefeitura..."
              error={errors.orgaoArrecadador}
              disabled={disabled}
              required
            />
          )}

          {rules.exibirFornecedor && (
            <FormSelectField
              label="Fornecedor / Cliente"
              value={formData.fornecedorCliente}
              onChange={(v) => updateField("fornecedorCliente", v)}
              options={clientes.map(c => ({ value: c.id, label: c.nome }))}
              placeholder="Buscar no CRM..."
              disabled={disabled}
            />
          )}

          {rules.exibirArtista && (
            <FormSelectField
              label="Artista Vinculado"
              value={formData.artistaVinculado}
              onChange={(v) => updateField("artistaVinculado", v)}
              options={artistas.map(a => ({ value: a.id, label: a.nome_artistico }))}
              placeholder="Selecione o artista"
              error={errors.artistaVinculado}
              disabled={disabled}
              required
            />
          )}

          {rules.exibirProjeto && formData.artistaVinculado && (
            <FormSelectField
              label={`Projeto / Música${rules.projetoObrigatorio ? "" : " (opcional)"}`}
              value={formData.projetoVinculado}
              onChange={(v) => updateField("projetoVinculado", v)}
              options={projetosFiltrados.map(p => ({ value: p.id, label: p.titulo }))}
              placeholder={projetosFiltrados.length === 0 ? "Nenhum projeto encontrado" : "Selecione o projeto"}
              error={errors.projetoVinculado}
              disabled={disabled || projetosFiltrados.length === 0}
              required={rules.projetoObrigatorio}
            />
          )}

          {rules.exibirEvento && formData.artistaVinculado && (
            <FormSelectField
              label="Show / Evento"
              value={formData.eventoVinculado}
              onChange={(v) => updateField("eventoVinculado", v)}
              options={eventosFiltrados.map(e => ({
                value: e.id,
                label: e.data_inicio ? `${e.titulo} (${e.data_inicio})` : e.titulo,
              }))}
              placeholder={eventosFiltrados.length === 0 ? "Nenhum evento encontrado" : "Selecione o evento"}
              error={errors.eventoVinculado}
              disabled={disabled || eventosFiltrados.length === 0}
              required
            />
          )}

          {rules.exibirMotivoViagem && (
            <FormInputField
              label="Motivo da Viagem"
              value={formData.motivoViagem}
              onChange={(e) => updateField("motivoViagem", e.target.value)}
              disabled={disabled}
              placeholder="Ex: Gravação de clipe em São Paulo, Show no festival X..."
              error={errors.motivoViagem}
              required
              colSpan="full"
              hint="O motivo será adicionado automaticamente nas observações."
            />
          )}

          {rules.exibirNomePublicidade && (
            <FormInputField
              label="Nome da Publicidade"
              value={formData.nomePublicidade}
              onChange={(e) => updateField("nomePublicidade", e.target.value)}
              disabled={disabled}
              placeholder="Ex: Campanha Marca X, Comercial TV Y..."
              error={errors.nomePublicidade}
              required
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

