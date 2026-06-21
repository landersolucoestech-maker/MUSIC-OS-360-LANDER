import type {
  FinancialCategoryLink,
  FinancialCategoryRuleEntity,
  FinancialCounterpartyType,
  FinancialTransactionType,
} from "@/modules/accounting/types/financial-category-rules.types";

type SeedRow = [
  FinancialTransactionType,
  FinancialCounterpartyType,
  string,
  string | null,
  FinancialCategoryLink[] | null,
];

const createdAt = "2026-05-26T00:00:00.000Z";

const seedRows: SeedRow[] = [
  ["Receita", "Empresa", "Receitas Musicais", "Direitos Autorais", ["Artista", "Projeto", "Contrato"]],
  ["Receita", "Empresa", "Receitas Musicais", "Direitos Conexos", ["Artista", "Projeto", "Contrato"]],
  ["Receita", "Empresa", "Receitas Musicais", "Streaming", ["Artista", "Projeto"]],
  ["Receita", "Empresa", "Receitas Musicais", "Licenciamento de Obra", ["Projeto", "Contrato"]],
  ["Receita", "Empresa", "Receitas Musicais", "Licenciamento de Fonograma", ["Projeto", "Contrato"]],
  ["Receita", "Empresa", "Receitas Musicais", "Sincronização", ["Projeto", "Contrato"]],
  ["Receita", "Empresa", "Serviços", "Produção Musical", ["Artista", "Projeto"]],
  ["Receita", "Empresa", "Serviços", "Produção Audiovisual", ["Projeto"]],
  ["Receita", "Empresa", "Serviços", "Mixagem", ["Projeto"]],
  ["Receita", "Empresa", "Serviços", "Masterização", ["Projeto"]],
  ["Receita", "Empresa", "Serviços", "Locação de Estúdio", null],
  ["Receita", "Pessoa", "Serviços", "Consultoria", ["Artista"]],
  ["Receita", "Pessoa", "Produtos", "Venda de Produtos Digitais", ["Projeto"]],
  ["Receita", "Pessoa", "Produtos", "Beats Avulsos", ["Projeto"]],
  ["Receita", "Pessoa", "Produtos", "Sample Packs", null],
  ["Despesa", "Empresa", "Operacional", "Produção Musical", ["Projeto"]],
  ["Despesa", "Empresa", "Operacional", "Produção Audiovisual", ["Projeto"]],
  ["Despesa", "Empresa", "Operacional", "TI / SaaS", ["Centro de custo"]],
  ["Despesa", "Empresa", "Administrativo", "Aluguel", ["Centro de custo"]],
  ["Despesa", "Empresa", "Administrativo", "Internet", ["Centro de custo"]],
  ["Despesa", "Empresa", "Marketing", "Anúncios", ["Projeto", "Artista"]],
  ["Despesa", "Empresa", "Marketing", "Videoclipe", ["Projeto", "Artista"]],
  ["Despesa", "Artista", "Cachês", "Show / Evento", ["Artista", "Evento"]],
  ["Despesa", "Artista", "Cachês", "Publicidade", ["Artista", "Contrato"]],
  ["Despesa", "Artista", "Suporte Financeiro", null, ["Artista", "Contrato"]],
  ["Despesa", "Pessoa", "Pessoal", "Freelancer", ["Projeto"]],
  ["Despesa", "Pessoa", "Pessoal", "Prestador PF", ["Projeto"]],
  ["Investimento", "Empresa", "Equipamentos", "Microfone", ["Centro de custo"]],
  ["Investimento", "Empresa", "Equipamentos", "Computador / Notebook", ["Centro de custo"]],
  ["Investimento", "Empresa", "Equipamentos", "Câmera", ["Centro de custo"]],
  ["Investimento", "Empresa", "Infraestrutura", "Reforma de Estúdio", ["Centro de custo"]],
  ["Investimento", "Empresa", "Infraestrutura", "Tratamento Acústico", ["Centro de custo"]],
  ["Investimento", "Empresa", "Tecnologia", "CRM / ERP", ["Centro de custo"]],
  ["Investimento", "Empresa", "Tecnologia", "Automação", ["Centro de custo"]],
  ["Imposto", "Governo", "Impostos", "DAS", ["Competência"]],
  ["Imposto", "Governo", "Impostos", "ISS", ["Competência"]],
  ["Imposto", "Governo", "Impostos", "IRRF", ["Competência"]],
  ["Imposto", "Governo", "Impostos", "INSS", ["Competência"]],
  ["Transferência", "Conta Própria", "Transferência", "Entre Contas", ["Conta Origem", "Conta Destino"]],
  ["Transferência", "Conta Própria", "Transferência", "Aplicação", ["Conta Origem", "Conta Destino"]],
  ["Transferência", "Conta Própria", "Transferência", "Resgate", ["Conta Origem", "Conta Destino"]],
];

export const financialCategoryRulesSeed: FinancialCategoryRuleEntity[] = seedRows.map(
  ([transactionType, counterpartyType, category, subcategory, links], index) => ({
    id: `financial-category-rule-${index + 1}`,
    transaction_type: transactionType,
    counterparty_type: counterpartyType,
    category,
    subcategory,
    links,
    active: true,
    sort_order: index + 1,
    created_at: createdAt,
    updated_at: createdAt,
  }),
);

