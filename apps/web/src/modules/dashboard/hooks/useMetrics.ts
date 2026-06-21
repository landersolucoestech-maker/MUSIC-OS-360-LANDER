/**
 * modules/dashboard/hooks/useMetrics.ts
 *
 * Hook agregador de métricas cross-módulo para o Dashboard.
 * Pertence ao módulo dashboard — NÃO é shared, pois importa directamente
 * de módulos de domínio. Shared nunca importa de módulos.
 */
import { useMemo } from "react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useClientes } from "@/modules/crm-relationships/hooks/useContacts";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { format, isToday, differenceInDays, startOfMonth, endOfMonth, parseISO, subDays } from "date-fns";

interface ArtistaDestaque {
  id: string;
  nome_artistico: string;
  genero_musical: string | null;
  lancamentos: number;
  /** null = dado de streams ainda não integrado (não exibir como 0). */
  streams: number | null;
  projetos: number;
  foto_url: string | null;
}

interface ArtistasMetrics {
  total: number;
  totalArtistas: number;
  comContrato: number;
  ativos: number;
  totalShows: number;
  showsAgendados: number;
  showsRealizados: number;
  receitaTotal: number;
}

interface CRMMetrics {
  total: number;
  ativos: number;
  leads: number;
  valorComercialContratado: number;
  totalContratos: number;
}

interface FinanceiroMetrics {
  receitasPagas: number;
  despesasPagas: number;
  lucroLiquido: number;
  contasReceber: number;
  contasPagar: number;
  margem: number;
  receitasPendentes: number;
  despesasPendentes: number;
}

interface DashboardMetrics {
  totalArtistas: number;
  contratosAtivos: number;
  contratosVencendo: number;
  receitaMensal: number;
  eventosHoje: number;
  eventosMes: number;
  artistasDestaque: ArtistaDestaque[];
}

export interface UseMetricsReturn {
  artistasMetrics: ArtistasMetrics;
  crmMetrics: CRMMetrics;
  financeiroMetrics: FinanceiroMetrics;
  dashboardMetrics: DashboardMetrics;
  isLoading: boolean;
}

export function useMetrics(): UseMetricsReturn {
  const { artistas, isLoading: loadingArtistas } = useArtistas();
  const { contratos, isLoading: loadingContratos } = useContratos();
  const { transacoes, isLoading: loadingTransacoes } = useTransacoes();
  const { eventos, isLoading: loadingEventos } = useEventos();
  const { clientes, isLoading: loadingClientes } = useClientes();
  const { lancamentos: lancamentosData, isLoading: loadingLancamentos } = useLancamentos();
  const { projetos, isLoading: loadingProjetos } = useProjetos();
  const isLoading = loadingArtistas || loadingContratos || loadingTransacoes ||
                    loadingEventos || loadingClientes || loadingLancamentos ||
                    loadingProjetos;

  const artistasMetrics = useMemo<ArtistasMetrics>(() => {
    const artistasComContrato = artistas.filter(a => a.contrato_id).length;
    const artistasAtivos = artistas.filter(a => a.status === "ativo" || a.status === "contratado").length;
    const shows = eventos;
    const totalShows = shows.length;
    const showsAgendados = shows.filter(e => {
      const s = (e.status ?? "").toLowerCase();
      return s === "confirmado" || s === "pendente" || s === "negociacao";
    }).length;
    const showsRealizados = shows.filter(e => (e.status ?? "").toLowerCase() === "realizado").length;
    const receitaTotal = shows
      .filter(e => {
        const s = (e.status ?? "").toLowerCase();
        return s === "confirmado" || s === "realizado";
      })
      .reduce((acc, e) => acc + ((e as Record<string, unknown>)["valor_cache"] as number || 0), 0);

    return {
      total: artistas.length,
      totalArtistas: artistas.length,
      comContrato: artistasComContrato,
      ativos: artistasAtivos,
      totalShows,
      showsAgendados,
      showsRealizados,
      receitaTotal,
    };
  }, [artistas, eventos]);

  const crmMetrics = useMemo<CRMMetrics>(() => {
    const ativos = clientes.filter(c => c.status === "ativo" || c.status === "cliente_ativo").length;
    const leads = clientes.filter(c => c.status === "lead").length;
    const contratosClientes = contratos.filter(c => c.cliente_id);
    const valorTotalContratos = contratosClientes
      .filter(c => c.status === "ativo")
      .reduce((acc, c) => acc + (c.valor || 0), 0);

    return {
      total: clientes.length,
      ativos,
      leads,
      valorComercialContratado: valorTotalContratos,
      totalContratos: contratosClientes.length,
    };
  }, [clientes, contratos]);

  const financeiroMetrics = useMemo<FinanceiroMetrics>(() => {
    const receitasPagas = transacoes
      .filter(t => t.tipo === "receita" && t.status === "pago")
      .reduce((acc, t) => acc + t.valor, 0);
    const despesasPagas = transacoes
      .filter(t => t.tipo === "despesa" && t.status === "pago")
      .reduce((acc, t) => acc + t.valor, 0);
    const contasReceber = transacoes
      .filter(t => t.tipo === "receita" && t.status === "pendente")
      .reduce((acc, t) => acc + t.valor, 0);
    const contasPagar = transacoes
      .filter(t => t.tipo === "despesa" && t.status === "pendente")
      .reduce((acc, t) => acc + t.valor, 0);
    const lucroLiquido = receitasPagas - despesasPagas;
    const margem = receitasPagas > 0 ? Math.round((lucroLiquido / receitasPagas) * 100) : 0;
    const receitasPendentes = transacoes.filter(t => t.tipo === "receita" && t.status === "pendente").length;
    const despesasPendentes = transacoes.filter(t => t.tipo === "despesa" && t.status === "pendente").length;

    return {
      receitasPagas,
      despesasPagas,
      lucroLiquido,
      contasReceber,
      contasPagar,
      margem,
      receitasPendentes,
      despesasPendentes,
    };
  }, [transacoes]);

  const dashboardMetrics = useMemo<DashboardMetrics>(() => {
    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);

    const contratosAtivos = contratos.filter(c => {
      if (c.status !== "ativo") return false;
      if (!c.data_inicio || !c.data_fim) return false;
      try {
        const inicio = parseISO(c.data_inicio as string);
        const fim = parseISO(c.data_fim as string);
        return hoje >= inicio && hoje <= fim;
      } catch { return false; }
    }).length;

    const contratosVencendo = contratos.filter(c => {
      if (c.status !== "ativo") return false;
      if (!c.data_fim) return false;
      try {
        const dataFim = parseISO(c.data_fim as string);
        const diasRestantes = differenceInDays(dataFim, hoje);
        return diasRestantes >= 0 && diasRestantes <= 30;
      } catch { return false; }
    }).length;

    const trintaDiasAtras = subDays(hoje, 30);
    const receitaMensal = transacoes
      .filter(t => {
        if (t.tipo !== "receita" || t.status !== "pago") return false;
        if (!t.data) return false;
        try {
          const dataTransacao = parseISO(t.data as string);
          return dataTransacao >= trintaDiasAtras && dataTransacao <= hoje;
        } catch { return false; }
      })
      .reduce((acc, t) => acc + t.valor, 0);

    // Backend retorna timestamp na coluna `data`; mock usa `data_inicio`.
    // Aceita os dois para evitar contagem zerada em HTTP mode.
    const readEventoData = (e: Record<string, unknown>): string | null => {
      const v =
        (e["data_inicio"] as string | null | undefined) ??
        (e["data"]        as string | null | undefined) ??
        null;
      return v ?? null;
    };

    const eventosHoje = eventos.filter(e => {
      const raw = readEventoData(e as Record<string, unknown>);
      if (!raw) return false;
      try { return isToday(parseISO(raw)); } catch { return false; }
    }).length;

    const eventosMes = eventos.filter(e => {
      const raw = readEventoData(e as Record<string, unknown>);
      if (!raw) return false;
      try {
        const d = parseISO(raw);
        return d >= inicioMes && d <= fimMes;
      } catch { return false; }
    }).length;

    const artistasComMetricas: ArtistaDestaque[] = artistas.map(artista => {
      const lancamentos = lancamentosData.filter(l => l.artista_id === artista.id).length;
      const projetosCount = projetos.filter(p => p.artista_id === artista.id).length;

      // Streams: tenta múltiplas fontes; se nenhuma disponível, retorna null
      // para a UI poder exibir "–" em vez de "0" falso.
      const a = artista as Record<string, unknown>;
      const integrationsData = a["integrations_data"] as Record<string, unknown> | undefined;
      const spotifyData = integrationsData?.["spotify"] as Record<string, unknown> | undefined;
      const streamsRaw =
        (a["spotify_ouvintes"] as number | undefined) ??
        (spotifyData?.["monthly_listeners"] as number | undefined) ??
        (spotifyData?.["listeners"] as number | undefined);
      const streams = typeof streamsRaw === "number" && Number.isFinite(streamsRaw)
        ? streamsRaw
        : null;

      return {
        id: artista.id,
        nome_artistico: artista.nome_artistico,
        genero_musical: artista.genero_musical ?? null,
        lancamentos,
        streams,
        projetos: projetosCount,
        foto_url: (a["foto_url"] as string | null) ?? null,
      };
    });

    const artistasDestaque = artistasComMetricas
      .sort((a, b) => {
        if (b.lancamentos !== a.lancamentos) return b.lancamentos - a.lancamentos;
        return b.projetos - a.projetos;
      })
      .slice(0, 4);

    return {
      totalArtistas: artistas.length,
      contratosAtivos,
      contratosVencendo,
      receitaMensal,
      eventosHoje,
      eventosMes,
      artistasDestaque,
    };
  }, [artistas, contratos, transacoes, eventos, lancamentosData, projetos]);

  void format; // date-fns import kept for potential future use

  return {
    artistasMetrics,
    crmMetrics,
    financeiroMetrics,
    dashboardMetrics,
    isLoading,
  };
}

