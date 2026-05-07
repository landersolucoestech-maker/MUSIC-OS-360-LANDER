import { useMemo } from "react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { format, isToday, differenceInDays, startOfMonth, endOfMonth, parseISO, subDays } from "date-fns";

interface ArtistaDestaque {
  id: string;
  nome_artistico: string;
  genero_musical: string | null;
  shows: number;
  receita: number;
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
  totalVendas: number;
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
  const isLoading = loadingArtistas || loadingContratos || loadingTransacoes || 
                    loadingEventos || loadingClientes;

  // Artistas Metrics - using eventos instead of vendas
  const artistasMetrics = useMemo<ArtistasMetrics>(() => {
    const artistasComContrato = artistas.filter(a => a.contrato_id).length;
    const artistasAtivos = artistas.filter(a => a.status === "ativo" || a.status === "contratado").length;
    
    // Calculate shows from all eventos (performances of any type)
    const shows = eventos;
    const totalShows = shows.length;
    const showsAgendados = shows.filter(e => {
      const s = (e.status ?? "").toLowerCase();
      return s === "confirmado" || s === "pendente" || s === "negociacao";
    }).length;
    const showsRealizados = shows.filter(e => (e.status ?? "").toLowerCase() === "realizado").length;

    // Calculate revenue from confirmed/realized events
    const receitaTotal = shows
      .filter(e => {
        const s = (e.status ?? "").toLowerCase();
        return s === "confirmado" || s === "realizado";
      })
      .reduce((acc, e) => acc + ((e as any).valor_cache || 0), 0);

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

  // CRM Metrics - using contratos instead of vendas
  const crmMetrics = useMemo<CRMMetrics>(() => {
    const ativos = clientes.filter(c => c.status === "ativo" || c.status === "cliente_ativo").length;
    const leads = clientes.filter(c => c.status === "lead").length;
    
    // Use contratos instead of vendas
    const contratosClientes = contratos.filter(c => c.cliente_id);
    const valorTotalContratos = contratosClientes
      .filter(c => c.status === "ativo")
      .reduce((acc, c) => acc + (c.valor || 0), 0);

    return {
      total: clientes.length,
      ativos,
      leads,
      totalVendas: valorTotalContratos,
      totalContratos: contratosClientes.length,
    };
  }, [clientes, contratos]);

  // Financeiro Metrics
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

  // Dashboard Metrics - using eventos instead of vendas
  const dashboardMetrics = useMemo<DashboardMetrics>(() => {
    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);

    const contratosAtivos = contratos.filter(c => {
      if (c.status !== "ativo") return false;
      try {
        const inicio = parseISO(c.data_inicio);
        const fim = parseISO(c.data_fim);
        return hoje >= inicio && hoje <= fim;
      } catch {
        return false;
      }
    }).length;
    
    const contratosVencendo = contratos.filter(c => {
      if (c.status !== "ativo") return false;
      try {
        const dataFim = parseISO(c.data_fim);
        const diasRestantes = differenceInDays(dataFim, hoje);
        return diasRestantes >= 0 && diasRestantes <= 30;
      } catch {
        return false;
      }
    }).length;

    const trintaDiasAtras = subDays(hoje, 30);
    const receitaMensal = transacoes
      .filter(t => {
        if (t.tipo !== "receita" || t.status !== "pago") return false;
        try {
          const dataTransacao = parseISO(t.data);
          return dataTransacao >= trintaDiasAtras && dataTransacao <= hoje;
        } catch {
          return false;
        }
      })
      .reduce((acc, t) => acc + t.valor, 0);

    const eventosHoje = eventos.filter(e => {
      try {
        return isToday(parseISO(e.data_inicio));
      } catch {
        return false;
      }
    }).length;

    const eventosMes = eventos.filter(e => {
      try {
        const d = parseISO(e.data_inicio);
        return d >= inicioMes && d <= fimMes;
      } catch {
        return false;
      }
    }).length;

    // Top 4 artistas por eventos/receita
    const artistasComReceita = artistas.map(artista => {
      const eventosArtista = eventos.filter(e => e.artista_id === artista.id);
      const receita = eventosArtista
        .filter(e => {
          const s = (e.status ?? "").toLowerCase();
          return s === "confirmado" || s === "realizado";
        })
        .reduce((acc, e) => acc + ((e as any).valor_cache || 0), 0);
      const shows = eventosArtista.filter(e => {
        const s = (e.status ?? "").toLowerCase();
        return s === "confirmado" || s === "realizado";
      }).length;

      return {
        id: artista.id,
        nome_artistico: artista.nome_artistico,
        genero_musical: artista.genero_musical,
        shows,
        receita,
      };
    });

    const artistasDestaque = artistasComReceita
      .sort((a, b) => b.receita - a.receita)
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
  }, [artistas, contratos, transacoes, eventos]);

  return {
    artistasMetrics,
    crmMetrics,
    financeiroMetrics,
    dashboardMetrics,
    isLoading,
  };
}
