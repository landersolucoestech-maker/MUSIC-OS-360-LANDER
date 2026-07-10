/**
 * billing-invoices.service.ts — histórico de faturas do workspace.
 *
 * Fonte da verdade: Stripe (via backend). NUNCA dados falsos na tela.
 *     A tela exibe empty state honesto (nada de faturas fake).
 *   - Produção: backend agrega as faturas do Stripe.
 *
 * CONTRATO BACKEND (futuro):
 *   GET /billing/invoices -> ApiResponse<BillingInvoice[]>
 */
import { api } from "@/shared/lib/api-client";

export interface BillingInvoice {
  id: string;
  /** Número/identificador da fatura. */
  number?: string | null;
  date: string;
  amount: string;
  status: string;
  /** Classe de cor do status (mesmo padrão da tabela). */
  statusColor?: string;
  pdfUrl?: string | null;
  stripeUrl?: string | null;
}

export const billingInvoicesService = {
  async listInvoices(): Promise<BillingInvoice[]> {
    return (await api.get<BillingInvoice[]>("/billing/invoices")) ?? [];
  },
};
