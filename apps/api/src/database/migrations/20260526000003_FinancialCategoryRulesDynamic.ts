import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FinancialCategoryRulesDynamic20260526000003 implements MigrationInterface {
  name = 'FinancialCategoryRulesDynamic20260526000003';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_category_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE financial_category_rules
        ADD COLUMN IF NOT EXISTS name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(40),
        ADD COLUMN IF NOT EXISTS counterparty_type VARCHAR(80),
        ADD COLUMN IF NOT EXISTS category VARCHAR(255),
        ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255),
        ADD COLUMN IF NOT EXISTS links JSONB,
        ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_financial_category_rules_dynamic_lookup
        ON financial_category_rules (tenant_id, transaction_type, counterparty_type, category, subcategory, active, sort_order);
    `);

    await qr.query(`
      WITH seed(transaction_type, counterparty_type, category, subcategory, links, sort_order) AS (
        VALUES
          ('Receita','Empresa','Receitas Musicais','Direitos Autorais','["Artista","Projeto","Contrato"]'::jsonb,1),
          ('Receita','Empresa','Receitas Musicais','Direitos Conexos','["Artista","Projeto","Contrato"]'::jsonb,2),
          ('Receita','Empresa','Receitas Musicais','Streaming','["Artista","Projeto"]'::jsonb,3),
          ('Receita','Empresa','Receitas Musicais','Licenciamento de Obra','["Projeto","Contrato"]'::jsonb,4),
          ('Receita','Empresa','Receitas Musicais','Licenciamento de Fonograma','["Projeto","Contrato"]'::jsonb,5),
          ('Receita','Empresa','Receitas Musicais','Sincronização','["Projeto","Contrato"]'::jsonb,6),
          ('Receita','Empresa','Serviços','Produção Musical','["Artista","Projeto"]'::jsonb,7),
          ('Receita','Empresa','Serviços','Produção Audiovisual','["Projeto"]'::jsonb,8),
          ('Receita','Empresa','Serviços','Mixagem','["Projeto"]'::jsonb,9),
          ('Receita','Empresa','Serviços','Masterização','["Projeto"]'::jsonb,10),
          ('Receita','Empresa','Serviços','Locação de Estúdio',NULL,11),
          ('Receita','Pessoa','Serviços','Consultoria','["Artista"]'::jsonb,12),
          ('Receita','Pessoa','Produtos','Venda de Produtos Digitais','["Projeto"]'::jsonb,13),
          ('Receita','Pessoa','Produtos','Beats Avulsos','["Projeto"]'::jsonb,14),
          ('Receita','Pessoa','Produtos','Sample Packs',NULL,15),
          ('Despesa','Empresa','Operacional','Produção Musical','["Projeto"]'::jsonb,16),
          ('Despesa','Empresa','Operacional','Produção Audiovisual','["Projeto"]'::jsonb,17),
          ('Despesa','Empresa','Operacional','TI / SaaS','["Centro de custo"]'::jsonb,18),
          ('Despesa','Empresa','Administrativo','Aluguel','["Centro de custo"]'::jsonb,19),
          ('Despesa','Empresa','Administrativo','Internet','["Centro de custo"]'::jsonb,20),
          ('Despesa','Empresa','Marketing','Anúncios','["Projeto","Artista"]'::jsonb,21),
          ('Despesa','Empresa','Marketing','Videoclipe','["Projeto","Artista"]'::jsonb,22),
          ('Despesa','Artista','Cachês','Show / Evento','["Artista","Evento"]'::jsonb,23),
          ('Despesa','Artista','Cachês','Publicidade','["Artista","Contrato"]'::jsonb,24),
          ('Despesa','Artista','Suporte Financeiro',NULL,'["Artista","Contrato"]'::jsonb,25),
          ('Despesa','Pessoa','Pessoal','Freelancer','["Projeto"]'::jsonb,26),
          ('Despesa','Pessoa','Pessoal','Prestador PF','["Projeto"]'::jsonb,27),
          ('Investimento','Empresa','Equipamentos','Microfone','["Centro de custo"]'::jsonb,28),
          ('Investimento','Empresa','Equipamentos','Computador / Notebook','["Centro de custo"]'::jsonb,29),
          ('Investimento','Empresa','Equipamentos','Câmera','["Centro de custo"]'::jsonb,30),
          ('Investimento','Empresa','Infraestrutura','Reforma de Estúdio','["Centro de custo"]'::jsonb,31),
          ('Investimento','Empresa','Infraestrutura','Tratamento Acústico','["Centro de custo"]'::jsonb,32),
          ('Investimento','Empresa','Tecnologia','CRM / ERP','["Centro de custo"]'::jsonb,33),
          ('Investimento','Empresa','Tecnologia','Automação','["Centro de custo"]'::jsonb,34),
          ('Imposto','Governo','Impostos','DAS','["Competência"]'::jsonb,35),
          ('Imposto','Governo','Impostos','ISS','["Competência"]'::jsonb,36),
          ('Imposto','Governo','Impostos','IRRF','["Competência"]'::jsonb,37),
          ('Imposto','Governo','Impostos','INSS','["Competência"]'::jsonb,38),
          ('Transferência','Conta Própria','Transferência','Entre Contas','["Conta Origem","Conta Destino"]'::jsonb,39),
          ('Transferência','Conta Própria','Transferência','Aplicação','["Conta Origem","Conta Destino"]'::jsonb,40),
          ('Transferência','Conta Própria','Transferência','Resgate','["Conta Origem","Conta Destino"]'::jsonb,41)
      ),
      tenants_scope AS (
        SELECT id AS tenant_id FROM tenants WHERE deleted_at IS NULL
      )
      INSERT INTO financial_category_rules (
        tenant_id,
        name,
        transaction_type,
        counterparty_type,
        category,
        subcategory,
        links,
        active,
        sort_order,
        conditions,
        actions,
        created_by
      )
      SELECT
        t.tenant_id,
        s.transaction_type || ' / ' || s.counterparty_type || ' / ' || s.category || COALESCE(' / ' || s.subcategory, ''),
        s.transaction_type,
        s.counterparty_type,
        s.category,
        s.subcategory,
        s.links,
        true,
        s.sort_order,
        '{}'::jsonb,
        '{}'::jsonb,
        'system'
      FROM tenants_scope t
      CROSS JOIN seed s
      WHERE NOT EXISTS (
        SELECT 1
        FROM financial_category_rules r
        WHERE r.tenant_id = t.tenant_id
          AND r.transaction_type = s.transaction_type
          AND r.counterparty_type = s.counterparty_type
          AND r.category = s.category
          AND COALESCE(r.subcategory, '') = COALESCE(s.subcategory, '')
      );
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP INDEX IF EXISTS idx_financial_category_rules_dynamic_lookup;
      ALTER TABLE financial_category_rules
        DROP COLUMN IF EXISTS transaction_type,
        DROP COLUMN IF EXISTS counterparty_type,
        DROP COLUMN IF EXISTS category,
        DROP COLUMN IF EXISTS subcategory,
        DROP COLUMN IF EXISTS links,
        DROP COLUMN IF EXISTS sort_order;
    `);
  }
}
