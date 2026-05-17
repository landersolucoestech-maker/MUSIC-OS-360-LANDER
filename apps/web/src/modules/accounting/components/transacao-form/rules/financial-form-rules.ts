import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import {
  getCategoriasParaTipoTransacao,
  getSubcategoriasParaCategoria,
  getItensInvestimentoPorCategoria,
  servicosDespesaComArtistaEProjeto,
  produtosDespesaComEvento,
  receitasMusicaisComArtistaEProjeto,
  servicosReceitaComArtistaEProjeto,
  servicosReceitaComArtista,
} from "@/modules/accounting/lib/transacao-constants";

export interface FinancialFormRules {
  exibirTipoCliente:    boolean;
  exibirCategoria:      boolean;
  exibirSubcategoria:   boolean;
  exibirItemInvestimento: boolean;
  exibirArtista:        boolean;
  exibirProjeto:        boolean;
  projetoObrigatorio:   boolean;
  exibirEvento:         boolean;
  exibirFornecedor:     boolean;
  exibirOrgaoArrecadador: boolean;
  exibirMotivoViagem:   boolean;
  exibirNomePublicidade: boolean;
  exibirParcelamento:   boolean;
  labelTipoCliente:     string;
}

export function computeFinancialRules(f: TransacaoFormData): FinancialFormRules {
  const isImposto      = f.tipoTransacao === "imposto";
  const isTransferencia = f.tipoTransacao === "transferencia";
  const isInvestimento  = f.tipoTransacao === "investimento";
  const isDespesa       = f.tipoTransacao === "despesa";
  const isReceita       = f.tipoTransacao === "receita";

  const isEmpresa        = f.tipoCliente === "empresa";
  const isArtista        = f.tipoCliente === "artista";
  const isPessoa         = f.tipoCliente === "pessoa";
  const isEmpresaOuPessoa = isEmpresa || isPessoa;

  const exibirTipoCliente = Boolean(f.tipoTransacao && !isImposto && !isTransferencia && !isInvestimento);

  const categorias    = getCategoriasParaTipoTransacao(f.tipoTransacao, f.tipoCliente);
  const exibirCategoria = categorias.length > 0 && Boolean(f.tipoCliente || isImposto || isTransferencia || isInvestimento);

  const subcategorias   = getSubcategoriasParaCategoria(f.tipoTransacao, f.tipoCliente, f.categoria);
  const exibirSubcategoria = subcategorias.length > 0;

  const itensInvestimento  = getItensInvestimentoPorCategoria(f.categoria);
  const exibirItemInvestimento = isInvestimento && Boolean(f.categoria) && itensInvestimento.length > 0;

  // ── Despesa Empresa/Pessoa ──────────────────────────────────────────────────
  const isDespesaServico  = isDespesa && isEmpresaOuPessoa && f.categoria === "servicos";
  const exibirArtistaServicoObrigatorio  = isDespesaServico && servicosDespesaComArtistaEProjeto.includes(f.subcategoria);
  const exibirProjetoServicoObrigatorio  = exibirArtistaServicoObrigatorio;

  const isDespesaMarketing = isDespesa && isEmpresaOuPessoa && f.categoria === "marketing";
  const exibirArtistaMarketingObrigatorio = isDespesaMarketing && Boolean(f.subcategoria);
  const exibirProjetoMarketingOpcional    = exibirArtistaMarketingObrigatorio && Boolean(f.artistaVinculado);

  const isDespesaViagem = isDespesa && isEmpresaOuPessoa && f.categoria === "viagens";
  const exibirArtistaViagemObrigatorio = isDespesaViagem && Boolean(f.subcategoria);
  const exibirMotivoViagem             = exibirArtistaViagemObrigatorio;

  const isDespesaProduto = isDespesa && isEmpresaOuPessoa && f.categoria === "produtos";
  const exibirArtistaProdutoObrigatorio = isDespesaProduto && Boolean(f.subcategoria);
  const exibirEventoProdutoObrigatorio  = isDespesaProduto && produtosDespesaComEvento.includes(f.subcategoria);

  const isDespesaSuporteFinanceiro = isDespesa && isEmpresaOuPessoa && f.categoria === "suporte-financeiro";
  const exibirArtistaSuporteFinanceiro = isDespesaSuporteFinanceiro;

  // ── Despesa Artista ─────────────────────────────────────────────────────────
  const isDespesaArtistaCaches = isDespesa && isArtista && f.categoria === "caches";
  const exibirArtistaArtistaCaches   = isDespesaArtistaCaches && Boolean(f.subcategoria);
  const exibirEventoArtistaCaches    = isDespesaArtistaCaches && f.subcategoria === "show-evento";
  const exibirNomePublicidade        = isDespesaArtistaCaches && f.subcategoria === "publicidade";

  const isDespesaArtistaSuporteFinanceiro   = isDespesa && isArtista && f.categoria === "suporte-financeiro";
  const exibirArtistaArtistaSuporteFinanceiro = isDespesaArtistaSuporteFinanceiro;

  // ── Receitas ────────────────────────────────────────────────────────────────
  const isReceitaMusical = isReceita && isEmpresaOuPessoa && f.categoria === "receitas-musicais";
  const exibirArtistaReceitaMusical = isReceitaMusical && Boolean(f.subcategoria);
  const exibirProjetoReceitaMusical = isReceitaMusical && receitasMusicaisComArtistaEProjeto.includes(f.subcategoria);
  const exibirEventoReceitaMusical  = isReceitaMusical && ["participacao-show-evento", "venda-show-fechado"].includes(f.subcategoria);

  const isReceitaServico = isReceita && isEmpresaOuPessoa && f.categoria === "servicos";
  const exibirArtistaServicoReceita = isReceitaServico && (
    servicosReceitaComArtistaEProjeto.includes(f.subcategoria) ||
    servicosReceitaComArtista.includes(f.subcategoria)
  );
  const exibirProjetoServicoReceita = isReceitaServico && servicosReceitaComArtistaEProjeto.includes(f.subcategoria);

  const isReceitaProduto = isReceita && isEmpresaOuPessoa && f.categoria === "produtos";
  const exibirArtistaProdutoReceita = isReceitaProduto && Boolean(f.subcategoria);

  // ── Consolidação ────────────────────────────────────────────────────────────
  const exibirArtista =
    exibirArtistaServicoObrigatorio ||
    exibirArtistaMarketingObrigatorio ||
    exibirArtistaViagemObrigatorio ||
    exibirArtistaProdutoObrigatorio ||
    exibirArtistaSuporteFinanceiro ||
    exibirArtistaArtistaCaches ||
    exibirArtistaArtistaSuporteFinanceiro ||
    exibirArtistaReceitaMusical ||
    exibirArtistaServicoReceita ||
    exibirArtistaProdutoReceita;

  const exibirProjeto =
    exibirProjetoServicoObrigatorio ||
    exibirProjetoMarketingOpcional ||
    exibirProjetoReceitaMusical ||
    exibirProjetoServicoReceita;

  const projetoObrigatorio =
    exibirProjetoServicoObrigatorio ||
    exibirProjetoReceitaMusical ||
    exibirProjetoServicoReceita;

  const exibirEvento =
    exibirEventoProdutoObrigatorio ||
    exibirEventoArtistaCaches ||
    exibirEventoReceitaMusical;

  const exibirFornecedor      = (isDespesa || isReceita) && isEmpresaOuPessoa;
  const exibirOrgaoArrecadador = isImposto;
  const exibirParcelamento    = f.tipoPagamento === "parcelado";

  const labelTipoCliente = isDespesa ? "Para quem pagar *" : isReceita ? "Receber de *" : "Tipo de Cliente *";

  return {
    exibirTipoCliente,
    exibirCategoria,
    exibirSubcategoria,
    exibirItemInvestimento,
    exibirArtista,
    exibirProjeto,
    projetoObrigatorio,
    exibirEvento,
    exibirFornecedor,
    exibirOrgaoArrecadador,
    exibirMotivoViagem,
    exibirNomePublicidade,
    exibirParcelamento,
    labelTipoCliente,
  };
}
