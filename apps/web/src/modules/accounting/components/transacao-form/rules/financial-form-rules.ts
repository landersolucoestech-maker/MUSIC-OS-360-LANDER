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
  exibirTipoCliente:      boolean;
  exibirCategoria:        boolean;
  exibirSubcategoria:     boolean;
  exibirItemInvestimento: boolean;
  exibirArtista:          boolean;
  exibirProjeto:          boolean;
  projetoObrigatorio:     boolean;
  exibirEvento:           boolean;
  exibirFornecedor:       boolean;
  exibirOrgaoArrecadador: boolean;
  exibirMotivoViagem:     boolean;
  exibirNomePublicidade:  boolean;
  exibirParcelamento:     boolean;
  labelTipoCliente:       string;
}

// ── Rule context ─────────────────────────────────────────────────────────────
// Intermediate booleans derived from formData that predicates can reference.
interface RuleContext {
  isImposto:      boolean;
  isTransferencia: boolean;
  isInvestimento: boolean;
  isDespesa:      boolean;
  isReceita:      boolean;
  isEmpresa:      boolean;
  isArtista:      boolean;
  isPessoa:       boolean;
  isEmpresaOuPessoa: boolean;
  isDespesaServico:             boolean;
  isDespesaMarketing:           boolean;
  isDespesaViagem:              boolean;
  isDespesaProduto:             boolean;
  isDespesaSuporteFinanceiro:   boolean;
  isDespesaArtistaCaches:       boolean;
  isDespesaArtistaSuporteFinanceiro: boolean;
  isReceitaMusical: boolean;
  isReceitaServico: boolean;
  isReceitaProduto: boolean;
  hasTipoTransacao: boolean;
}

function buildContext(f: TransacaoFormData): RuleContext {
  const isImposto       = f.tipoTransacao === "imposto";
  const isTransferencia = f.tipoTransacao === "transferencia";
  const isInvestimento  = f.tipoTransacao === "investimento";
  const isDespesa       = f.tipoTransacao === "despesa";
  const isReceita       = f.tipoTransacao === "receita";
  const isEmpresa       = f.tipoCliente === "empresa";
  const isArtista       = f.tipoCliente === "artista";
  const isPessoa        = f.tipoCliente === "pessoa";
  const isEmpresaOuPessoa = isEmpresa || isPessoa;
  return {
    isImposto, isTransferencia, isInvestimento, isDespesa, isReceita,
    isEmpresa, isArtista, isPessoa, isEmpresaOuPessoa,
    isDespesaServico:             isDespesa && isEmpresaOuPessoa && f.categoria === "servicos",
    isDespesaMarketing:           isDespesa && isEmpresaOuPessoa && f.categoria === "marketing",
    isDespesaViagem:              isDespesa && isEmpresaOuPessoa && f.categoria === "viagens",
    isDespesaProduto:             isDespesa && isEmpresaOuPessoa && f.categoria === "produtos",
    isDespesaSuporteFinanceiro:   isDespesa && isEmpresaOuPessoa && f.categoria === "suporte-financeiro",
    isDespesaArtistaCaches:       isDespesa && isArtista && f.categoria === "caches",
    isDespesaArtistaSuporteFinanceiro: isDespesa && isArtista && f.categoria === "suporte-financeiro",
    isReceitaMusical: isReceita && isEmpresaOuPessoa && f.categoria === "receitas-musicais",
    isReceitaServico: isReceita && isEmpresaOuPessoa && f.categoria === "servicos",
    isReceitaProduto: isReceita && isEmpresaOuPessoa && f.categoria === "produtos",
    hasTipoTransacao: Boolean(f.tipoTransacao),
  };
}

// ── DISPLAY_RULES — the single configurable source of truth for every boolean ─
// Each entry is a pure predicate (f, ctx) → boolean.
// To add, remove, or change a rule, edit only this map — no other code needs to change.
type BooleanRuleKey = Exclude<keyof FinancialFormRules, "labelTipoCliente">;
type RulePredicate  = (f: TransacaoFormData, ctx: RuleContext) => boolean;

export const DISPLAY_RULES: Record<BooleanRuleKey, RulePredicate> = {
  exibirTipoCliente: (_f, ctx) =>
    ctx.hasTipoTransacao && !ctx.isImposto && !ctx.isTransferencia && !ctx.isInvestimento,

  exibirCategoria: (f, ctx) => {
    const categorias = getCategoriasParaTipoTransacao(f.tipoTransacao, f.tipoCliente);
    return categorias.length > 0 && Boolean(f.tipoCliente || ctx.isImposto || ctx.isTransferencia || ctx.isInvestimento);
  },

  exibirSubcategoria: (f) => {
    const subs = getSubcategoriasParaCategoria(f.tipoTransacao, f.tipoCliente, f.categoria);
    return subs.length > 0;
  },

  exibirItemInvestimento: (f, ctx) => {
    const itens = getItensInvestimentoPorCategoria(f.categoria);
    return ctx.isInvestimento && Boolean(f.categoria) && itens.length > 0;
  },

  exibirArtista: (f, ctx) =>
    (ctx.isDespesaServico  && servicosDespesaComArtistaEProjeto.includes(f.subcategoria)) ||
    (ctx.isDespesaMarketing && Boolean(f.subcategoria)) ||
    (ctx.isDespesaViagem   && Boolean(f.subcategoria)) ||
    (ctx.isDespesaProduto  && Boolean(f.subcategoria)) ||
    ctx.isDespesaSuporteFinanceiro ||
    (ctx.isDespesaArtistaCaches && Boolean(f.subcategoria)) ||
    ctx.isDespesaArtistaSuporteFinanceiro ||
    (ctx.isReceitaMusical && Boolean(f.subcategoria)) ||
    (ctx.isReceitaServico && (
      servicosReceitaComArtistaEProjeto.includes(f.subcategoria) ||
      servicosReceitaComArtista.includes(f.subcategoria)
    )) ||
    (ctx.isReceitaProduto && Boolean(f.subcategoria)),

  exibirProjeto: (f, ctx) =>
    (ctx.isDespesaServico   && servicosDespesaComArtistaEProjeto.includes(f.subcategoria)) ||
    (ctx.isDespesaMarketing && Boolean(f.subcategoria) && Boolean(f.artistaVinculado)) ||
    (ctx.isReceitaMusical   && receitasMusicaisComArtistaEProjeto.includes(f.subcategoria)) ||
    (ctx.isReceitaServico   && servicosReceitaComArtistaEProjeto.includes(f.subcategoria)),

  projetoObrigatorio: (f, ctx) =>
    (ctx.isDespesaServico  && servicosDespesaComArtistaEProjeto.includes(f.subcategoria)) ||
    (ctx.isReceitaMusical  && receitasMusicaisComArtistaEProjeto.includes(f.subcategoria)) ||
    (ctx.isReceitaServico  && servicosReceitaComArtistaEProjeto.includes(f.subcategoria)),

  exibirEvento: (f, ctx) =>
    (ctx.isDespesaProduto      && produtosDespesaComEvento.includes(f.subcategoria)) ||
    (ctx.isDespesaArtistaCaches && f.subcategoria === "show-evento") ||
    (ctx.isReceitaMusical       && ["participacao-show-evento", "venda-show-fechado"].includes(f.subcategoria)),

  exibirFornecedor: (_f, ctx) => (ctx.isDespesa || ctx.isReceita) && ctx.isEmpresaOuPessoa,

  exibirOrgaoArrecadador: (_f, ctx) => ctx.isImposto,

  exibirMotivoViagem: (f, ctx) => ctx.isDespesaViagem && Boolean(f.subcategoria),

  exibirNomePublicidade: (f, ctx) => ctx.isDespesaArtistaCaches && f.subcategoria === "publicidade",

  exibirParcelamento: (f) => f.tipoPagamento === "parcelado",
};

// ── computeFinancialRules — applies DISPLAY_RULES map + derives label ─────────
export function computeFinancialRules(f: TransacaoFormData): FinancialFormRules {
  const ctx = buildContext(f);

  const booleans = Object.fromEntries(
    (Object.entries(DISPLAY_RULES) as [BooleanRuleKey, RulePredicate][]).map(
      ([key, predicate]) => [key, predicate(f, ctx)],
    ),
  ) as Record<BooleanRuleKey, boolean>;

  const labelTipoCliente = ctx.isDespesa ? "Pagar quem" : ctx.isReceita ? "Receber de" : "Tipo de Cliente";

  return { ...booleans, labelTipoCliente };
}

