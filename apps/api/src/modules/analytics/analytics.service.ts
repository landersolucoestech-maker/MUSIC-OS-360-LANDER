import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { AiUsageLogEntity } from '../../database/entities';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DATA_SOURCE) private readonly ds: DataSource | null) {}

  // ── AI Usage Governance ────────────────────────────────────────────────────

  async logAiUsage(params: {
    tenantId:     string;
    jobId?:       string;
    model:        string;
    feature:      string;
    tokensInput:  number;
    tokensOutput: number;
    costUsd?:     number;
    latencyMs?:   number;
    outcome?:     string;
    userId?:      string;
  }): Promise<void> {
    if (!this.ds) return;
    const repo = this.ds.getRepository(AiUsageLogEntity);
    await repo.save(repo.create({
      tenant_id:    params.tenantId,
      job_id:       params.jobId ?? null,
      model:        params.model,
      feature:      params.feature,
      tokens_input:  params.tokensInput,
      tokens_output: params.tokensOutput,
      cost_usd:     (params.costUsd ?? 0).toFixed(6),
      latency_ms:   params.latencyMs ?? null,
      outcome:      params.outcome ?? 'success',
      user_id:      params.userId ?? null,
    }));
  }

  async getAiUsageSummary(tenantId: string, days = 30) {
    if (!this.ds) return null;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.ds.query<Array<{
      model: string;
      feature: string;
      calls: string;
      tokens_total: string;
      cost_total: string;
    }>>(`
      SELECT
        model,
        feature,
        COUNT(*)::int          AS calls,
        SUM(tokens_input + tokens_output)::bigint AS tokens_total,
        SUM(cost_usd)::numeric(12,6)              AS cost_total
      FROM ai_usage_logs
      WHERE tenant_id = $1 AND created_at >= $2
      GROUP BY model, feature
      ORDER BY cost_total DESC
    `, [tenantId, since]);

    const totals = await this.ds.query<Array<{
      total_calls: string;
      total_tokens: string;
      total_cost: string;
    }>>(`
      SELECT
        COUNT(*)::int          AS total_calls,
        SUM(tokens_input + tokens_output)::bigint AS total_tokens,
        SUM(cost_usd)::numeric(12,6)              AS total_cost
      FROM ai_usage_logs
      WHERE tenant_id = $1 AND created_at >= $2
    `, [tenantId, since]);

    return {
      period_days: days,
      breakdown:   rows,
      totals: totals[0] ?? { total_calls: 0, total_tokens: 0, total_cost: '0.000000' },
    };
  }

  // ── Operational Dashboard ──────────────────────────────────────────────────

  async getDashboard(tenantId: string) {
    if (!this.ds) return null;

    const [
      artistCount,
      contractCount,
      leadCount,
      openTickets,
      campaignCount,
      pipelineOppCount,
    ] = await Promise.all([
      this.countTable('artists', tenantId),
      this.countTable('contracts', tenantId),
      this.countTable('leads', tenantId),
      this.ds.query<[{ cnt: string }]>(
        `SELECT COUNT(*)::int AS cnt FROM support_tickets WHERE tenant_id = $1 AND status NOT IN ('resolved','closed') AND deleted_at IS NULL`,
        [tenantId],
      ),
      this.countTable('campaigns', tenantId),
      this.ds.query<[{ cnt: string }]>(
        `SELECT COUNT(*)::int AS cnt FROM pipeline_opportunities WHERE tenant_id = $1 AND status = 'open' AND deleted_at IS NULL`,
        [tenantId],
      ),
    ]);

    return {
      artists:             artistCount,
      contracts:           contractCount,
      leads:               leadCount,
      open_tickets:        parseInt(openTickets[0]?.cnt ?? '0'),
      campaigns:           campaignCount,
      open_opportunities:  parseInt(pipelineOppCount[0]?.cnt ?? '0'),
      generated_at:        new Date().toISOString(),
    };
  }

  // ── Revenue Overview ───────────────────────────────────────────────────────

  async getRevenueOverview(tenantId: string, months = 6) {
    if (!this.ds) return null;
    const rows = await this.ds.query<Array<{
      month: string;
      receitas: string;
      despesas: string;
    }>>(`
      SELECT
        DATE_TRUNC('month', data)::date AS month,
        SUM(CASE WHEN tipo = 'receita' THEN valor::numeric ELSE 0 END) AS receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor::numeric ELSE 0 END) AS despesas
      FROM transactions
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND data >= NOW() - INTERVAL '${months} months'
      GROUP BY 1
      ORDER BY 1 ASC
    `, [tenantId]);

    return { months, series: rows };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async countTable(table: string, tenantId: string): Promise<number> {
    const [row] = await this.ds!.query<[{ cnt: string }]>(
      `SELECT COUNT(*)::int AS cnt FROM ${table} WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    return parseInt(row?.cnt ?? '0');
  }
}
