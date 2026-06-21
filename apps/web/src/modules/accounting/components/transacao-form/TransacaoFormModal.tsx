import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  formasPagamento,
  intervalosParcelas,
  orgaosArrecadadores,
  statusTransacao,
  tiposCliente,
  tiposClienteReceita,
  tiposPagamento,
  tiposTransacao,
} from "@/modules/accounting/lib/transacao-constants";
import * as TransacaoOptions from "@/modules/accounting/lib/transacao-constants";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm-relationships/hooks/useContacts";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useMarketingCampaigns } from "@/modules/marketing/hooks/useMarketingCampaigns";
import { useFinancialCategoryRulesStore } from "@/modules/accounting/hooks/useFinancialCategoryRulesStore";
import type { TransacaoFormEntity } from "@/modules/accounting/mappers";
import { useTransacaoFormController } from "./hooks/useTransacaoFormController";
import { TransactionTypeSection } from "./sections/TransactionTypeSection";
import { ManagerialLinksSection, type EntityOptions } from "./sections/ManagerialLinksSection";
import { PaymentSection } from "./sections/PaymentSection";
import { DetailsSection } from "./sections/DetailsSection";

type FieldExportRow = {
  secao: string;
  campo: string;
  chave: string;
  visivel: "Sim" | "Não";
  obrigatorio: "Sim" | "Não";
  itens: string;
  valorAtual: string;
};

type OptionExportRow = {
  origem: string;
  campo: string;
  valor: string;
  item: string;
};

type FinancialCatalogExportRow = {
  transactionType: string;
  counterpartyType: string;
  categoria: string;
  subcategoria: string;
  vinculacoes: string;
  ativo: string;
  ordem: number;
};

interface TransacaoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacao?: TransacaoFormEntity;
  mode: "create" | "edit" | "view";
}

export function TransacaoFormModal({
  open,
  onOpenChange,
  transacao,
  mode,
}: TransacaoFormModalProps) {
  const { artistas } = useArtistas();
  const { clientes } = useClientes();
  const { projetos } = useProjetos();
  const { eventos } = useEventos();
  const { data: campanhas = [] } = useMarketingCampaigns();
  const { rules: categoryRules } = useFinancialCategoryRulesStore();

  // Fontes reais para os Vínculos Gerenciais (P&L).
  const entityOptions: EntityOptions = {
    projeto: projetos.map((p) => ({ value: p.id, label: p.titulo })),
    artista: artistas.map((a) => ({ value: a.id, label: a.nome_artistico })),
    empresa: clientes.map((c) => ({ value: c.id, label: c.nome })),
    campanha: campanhas.map((c) => ({ value: c.id, label: c.name })),
    evento: eventos.map((e) => ({ value: e.id, label: e.titulo })),
  };

  const form = useTransacaoFormController({
    open,
    mode,
    transacao,
    onClose: () => onOpenChange(false),
    projetos,
    eventos,
  });
  const rules = form.visibleRules;
  const disabled = form.isViewMode || form.isSubmitting;

  const buildFieldRows = (): FieldExportRow[] => {
    const joinOptions = (options: { label: string }[]) => options.map((option) => option.label).join(", ");
    const tipoClienteOptions = form.formData.tipoTransacao === "receita" ? tiposClienteReceita : tiposCliente;

    const rows: FieldExportRow[] = [
      {
        secao: "Tipo de Transação",
        campo: "Tipo de Transação",
        chave: "tipoTransacao",
        visivel: "Sim",
        obrigatorio: "Sim",
        itens: joinOptions(tiposTransacao),
        valorAtual: form.formData.tipoTransacao,
      },
      {
        secao: "Tipo de Transação",
        campo: rules.labelTipoCliente,
        chave: "tipoCliente",
        visivel: rules.exibirTipoCliente ? "Sim" : "Não",
        obrigatorio: rules.exibirTipoCliente ? "Sim" : "Não",
        itens: joinOptions(tipoClienteOptions),
        valorAtual: form.formData.tipoCliente,
      },
      {
        secao: "Classificação",
        campo: "Categoria",
        chave: "categoria",
        visivel: rules.exibirCategoria ? "Sim" : "Não",
        obrigatorio: rules.exibirCategoria ? "Sim" : "Não",
        itens: joinOptions(rules.categorias),
        valorAtual: form.formData.categoria,
      },
      {
        secao: "Classificação",
        campo: "Tipo / Subcategoria",
        chave: "subcategoria",
        visivel: rules.exibirSubcategoria ? "Sim" : "Não",
        obrigatorio: rules.exibirSubcategoria ? "Sim" : "Não",
        itens: joinOptions(rules.subcategorias),
        valorAtual: form.formData.subcategoria,
      },
      {
        secao: "Classificação",
        campo: "Item",
        chave: "itemInvestimento",
        visivel: rules.exibirItemInvestimento ? "Sim" : "Não",
        obrigatorio: rules.exibirItemInvestimento ? "Sim" : "Não",
        itens: joinOptions(rules.itensInvestimento),
        valorAtual: form.formData.itemInvestimento,
      },
      {
        secao: "Vinculações",
        campo: "Vinculações",
        chave: "tipoVinculacao",
        visivel: form.formData.tipoTransacao ? "Sim" : "Não",
        obrigatorio: "Não",
        itens: "Artista, Projeto, Empresa",
        valorAtual: form.formData.tipoVinculacao ?? "",
      },
      {
        secao: "Vinculações",
        campo: "Artista Vinculado",
        chave: "artistaVinculado",
        visivel: form.formData.tipoVinculacao === "artista" ? "Sim" : "Não",
        obrigatorio: form.formData.tipoVinculacao === "artista" ? "Sim" : "Não",
        itens: artistas.map((artista) => artista.nome_artistico).join(", "),
        valorAtual: form.formData.artistaVinculado,
      },
      {
        secao: "Vinculações",
        campo: "Projeto Vinculado",
        chave: "projetoVinculado",
        visivel: form.formData.tipoVinculacao === "projeto" ? "Sim" : "Não",
        obrigatorio: form.formData.tipoVinculacao === "projeto" ? "Sim" : "Não",
        itens: projetos.map((projeto) => projeto.titulo).join(", "),
        valorAtual: form.formData.projetoVinculado,
      },
      {
        secao: "Vinculações",
        campo: "Empresa Vinculada",
        chave: "fornecedorCliente",
        visivel: form.formData.tipoVinculacao === "empresa" ? "Sim" : "Não",
        obrigatorio: "Não",
        itens: clientes.map((cliente) => cliente.nome).join(", "),
        valorAtual: form.formData.fornecedorCliente,
      },
      {
        secao: "Vinculações",
        campo: "Órgão Arrecadador",
        chave: "orgaoArrecadador",
        visivel: rules.exibirOrgaoArrecadador && Boolean(form.formData.categoria) ? "Sim" : "Não",
        obrigatorio: rules.exibirOrgaoArrecadador && Boolean(form.formData.categoria) ? "Sim" : "Não",
        itens: orgaosArrecadadores.map((orgao) => orgao.nome).join(", "),
        valorAtual: form.formData.orgaoArrecadador,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Valor (R$)",
        chave: "valor",
        visivel: "Sim",
        obrigatorio: "Sim",
        itens: "",
        valorAtual: form.formData.valor,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Tipo de Pagamento",
        chave: "tipoPagamento",
        visivel: "Sim",
        obrigatorio: "Não",
        itens: joinOptions(tiposPagamento),
        valorAtual: form.formData.tipoPagamento,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Método de Pagamento",
        chave: "formaPagamento",
        visivel: "Sim",
        obrigatorio: "Sim",
        itens: joinOptions(formasPagamento),
        valorAtual: form.formData.formaPagamento,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Data da Transação",
        chave: "dataTransacao",
        visivel: "Sim",
        obrigatorio: "Sim",
        itens: "",
        valorAtual: form.formData.dataTransacao,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Status",
        chave: "status",
        visivel: "Sim",
        obrigatorio: "Não",
        itens: joinOptions(statusTransacao),
        valorAtual: form.formData.status,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Quantidade de Parcelas",
        chave: "quantidadeParcelas",
        visivel: rules.exibirParcelamento ? "Sim" : "Não",
        obrigatorio: rules.exibirParcelamento ? "Sim" : "Não",
        itens: "",
        valorAtual: form.formData.quantidadeParcelas,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Intervalo",
        chave: "intervaloParcelas",
        visivel: rules.exibirParcelamento ? "Sim" : "Não",
        obrigatorio: "Não",
        itens: joinOptions(intervalosParcelas),
        valorAtual: form.formData.intervaloParcelas,
      },
      {
        secao: "Valores e Pagamento",
        campo: "Data da 1ª Parcela",
        chave: "dataPrimeiraParcela",
        visivel: rules.exibirParcelamento ? "Sim" : "Não",
        obrigatorio: rules.exibirParcelamento ? "Sim" : "Não",
        itens: "",
        valorAtual: form.formData.dataPrimeiraParcela,
      },
      {
        secao: "Detalhes",
        campo: "Descrição",
        chave: "descricao",
        visivel: "Sim",
        obrigatorio: "Sim",
        itens: "",
        valorAtual: form.formData.descricao,
      },
      {
        secao: "Detalhes",
        campo: "Observações",
        chave: "observacao",
        visivel: "Sim",
        obrigatorio: "Não",
        itens: "",
        valorAtual: form.formData.observacao,
      },
      {
        secao: "Detalhes",
        campo: "Anexo",
        chave: "anexoNome",
        visivel: "Sim",
        obrigatorio: "Não",
        itens: "PDF, JPG, PNG, DOC, DOCX",
        valorAtual: form.formData.anexoNome,
      },
    ];

    rows.push(
      {
        secao: "Vinculações",
        campo: "Contrato Vinculado",
        chave: "contratoVinculado",
        visivel: "Não",
        obrigatorio: "Não",
        itens: "",
        valorAtual: form.formData.contratoVinculado,
      },
      {
        secao: "Vinculações",
        campo: "Show / Evento",
        chave: "eventoVinculado",
        visivel: rules.exibirEvento ? "Sim" : "Não",
        obrigatorio: rules.exibirEvento ? "Sim" : "Não",
        itens: eventos.map((evento) => evento.titulo).join(", "),
        valorAtual: form.formData.eventoVinculado,
      },
      {
        secao: "Vinculações",
        campo: "Motivo da Viagem",
        chave: "motivoViagem",
        visivel: rules.exibirMotivoViagem ? "Sim" : "Não",
        obrigatorio: rules.exibirMotivoViagem ? "Sim" : "Não",
        itens: "",
        valorAtual: form.formData.motivoViagem,
      },
      {
        secao: "Vinculações",
        campo: "Nome da Publicidade",
        chave: "nomePublicidade",
        visivel: rules.exibirNomePublicidade ? "Sim" : "Não",
        obrigatorio: rules.exibirNomePublicidade ? "Sim" : "Não",
        itens: "",
        valorAtual: form.formData.nomePublicidade,
      },
      {
        secao: "Detalhes",
        campo: "URL do Anexo",
        chave: "anexoUrl",
        visivel: "Sim",
        obrigatorio: "Não",
        itens: "",
        valorAtual: form.formData.anexoUrl,
      },
    );

    return rows;
  };

  const buildOptionRows = (): OptionExportRow[] => {
    const rows: OptionExportRow[] = [];

    for (const [origin, value] of Object.entries(TransacaoOptions)) {
      if (!Array.isArray(value)) continue;

      for (const item of value) {
        if (typeof item === "string") {
          rows.push({
            origem: origin,
            campo: origin,
            valor: item,
            item,
          });
          continue;
        }

        if (item && typeof item === "object") {
          const record = item as { value?: unknown; label?: unknown; id?: unknown; nome?: unknown };
          const optionValue = String(record.value ?? record.id ?? "");
          const optionLabel = String(record.label ?? record.nome ?? optionValue);

          rows.push({
            origem: origin,
            campo: origin,
            valor: optionValue,
            item: optionLabel,
          });
        }
      }
    }

    for (const artista of artistas) {
      rows.push({
        origem: "useArtistas",
        campo: "artistaVinculado",
        valor: artista.id,
        item: artista.nome_artistico,
      });
    }

    for (const projeto of projetos) {
      rows.push({
        origem: "useProjetos",
        campo: "projetoVinculado",
        valor: projeto.id,
        item: projeto.titulo,
      });
    }

    for (const evento of eventos) {
      rows.push({
        origem: "useEventos",
        campo: "eventoVinculado",
        valor: evento.id,
        item: evento.titulo,
      });
    }

    for (const cliente of clientes) {
      rows.push({
        origem: "useClientes",
        campo: "fornecedorCliente",
        valor: cliente.id,
        item: cliente.nome,
      });
    }

    for (const option of ["Artista", "Projeto", "Empresa"]) {
      rows.push({
        origem: "tiposVinculacao",
        campo: "tipoVinculacao",
        valor: option.toLowerCase(),
        item: option,
      });
    }

    rows.push(
      { origem: "formatosAnexo", campo: "anexoNome", valor: "pdf", item: "PDF" },
      { origem: "formatosAnexo", campo: "anexoNome", valor: "jpg", item: "JPG" },
      { origem: "formatosAnexo", campo: "anexoNome", valor: "jpeg", item: "JPEG" },
      { origem: "formatosAnexo", campo: "anexoNome", valor: "png", item: "PNG" },
      { origem: "formatosAnexo", campo: "anexoNome", valor: "doc", item: "DOC" },
      { origem: "formatosAnexo", campo: "anexoNome", valor: "docx", item: "DOCX" },
    );

    return rows;
  };

  const buildFinancialCatalogRows = (): FinancialCatalogExportRow[] => {
    return categoryRules
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((rule) => ({
        transactionType: rule.transaction_type,
        counterpartyType: rule.counterparty_type,
        categoria: rule.category,
        subcategoria: rule.subcategory ?? "",
        vinculacoes: rule.links?.join(", ") ?? "",
        ativo: rule.active ? "Sim" : "Não",
        ordem: rule.sort_order,
      }));
  };

  const exportFieldList = () => {
    const worksheet = XLSX.utils.json_to_sheet(buildFieldRows(), {
      header: ["secao", "campo", "chave", "visivel", "obrigatorio", "itens", "valorAtual"],
    });
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [["Seção", "Campo", "Chave", "Visível", "Obrigatório", "Itens da lista", "Valor atual"]],
      { origin: "A1" },
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Campos");

    const optionsWorksheet = XLSX.utils.json_to_sheet(buildOptionRows(), {
      header: ["origem", "campo", "valor", "item"],
    });
    XLSX.utils.sheet_add_aoa(
      optionsWorksheet,
      [["Origem", "Campo", "Valor", "Item"]],
      { origin: "A1" },
    );
    XLSX.utils.book_append_sheet(workbook, optionsWorksheet, "Itens");

    const catalogWorksheet = XLSX.utils.json_to_sheet(buildFinancialCatalogRows(), {
      header: [
        "transactionType",
        "counterpartyType",
        "categoria",
        "subcategoria",
        "vinculacoes",
        "ativo",
        "ordem",
      ],
    });
    XLSX.utils.sheet_add_aoa(
      catalogWorksheet,
      [[
        "Tipo de Transação",
        "Tipo de Cliente",
        "Valor da Categoria",
        "Categoria",
        "Valor da Subcategoria",
        "Subcategoria",
        "Valor do Item de Investimento",
        "Item de Investimento",
      ]],
      { origin: "A1" },
    );
    XLSX.utils.book_append_sheet(workbook, catalogWorksheet, "Catálogo Financeiro");

    XLSX.writeFile(workbook, "campos-nova-transacao-financeira.xlsx");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.handleClose();
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{form.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit} className="space-y-5">
          <TransactionTypeSection
            formData={form.formData}
            rules={rules}
            categoryRules={categoryRules}
            errors={form.errors}
            disabled={disabled}
            updateField={form.updateField}
            artistas={artistas}
            clientes={clientes}
            projetos={projetos}
            projetosFiltrados={rules.projetosFiltrados}
            eventosFiltrados={rules.eventosFiltrados}
          />

          <PaymentSection
            formData={form.formData}
            rules={rules}
            errors={form.errors}
            disabled={disabled}
            updateField={form.updateField}
          />

          <DetailsSection
            formData={form.formData}
            errors={form.errors}
            disabled={disabled}
            updateField={form.updateField}
            handleFileUpload={form.handleFileUpload}
            handleRemoveAnexo={form.handleRemoveAnexo}
          />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleClose}
              disabled={form.isSubmitting}
            >
              {form.isViewMode ? "Fechar" : "Cancelar"}
            </Button>
            {!form.isViewMode && (
              <Button
                type="submit"
                disabled={form.isSubmitting}
              >
                {form.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  mode === "create" ? "Salvar Transação" : "Salvar Alterações"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

