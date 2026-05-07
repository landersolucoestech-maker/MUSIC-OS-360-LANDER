/**
 * STEP 1+4 — Application Use Case: generatePL
 *
 * Orquestra a geração de relatórios de P&L e recoupment.
 * Coordena dados de transações, artistas, projetos e contratos.
 *
 * STEP 4: Lança erros tipados (DomainError).
 *
 * Usado por: Contabilidade.tsx
 */
import { transacaoService } from "@/modules/financeiro/services/financeiro.service";
import { artistaService } from "@/modules/artist/services/artista.service";
import { projetoService } from "@/modules/projects/services/projeto.service";
import { contratoService } from "@/modules/contracts/services/contracts.service";
import {
  calcularPLPorArtista,
  calcularPLPorProjeto,
  calcularRecoupments,
} from "@/modules/financeiro/domain/contabilidade.entity";
import { DomainError } from "@/shared/lib/errors";

export interface PLReport {
  plPorProjeto: ReturnType<typeof calcularPLPorProjeto>;
  plPorArtista: ReturnType<typeof calcularPLPorArtista>;
  recoupments: ReturnType<typeof calcularRecoupments>;
  generatedAt: string;
}

export async function generatePLUseCase(): Promise<PLReport> {
  try {
    // 1. Carregar todos os dados necessários em paralelo
    const [transacoes, artistas, projetos, contratos] = await Promise.all([
      transacaoService.list(),
      artistaService.list(),
      projetoService.list(),
      contratoService.list(),
    ]);

    // 2. Calcular P&L por projeto
    const plPorProjeto = calcularPLPorProjeto(
      projetos.map((p) => ({
        id: p.id as string,
        titulo: p.titulo as string | null,
        tipo: p.tipo as string | null,
      })),
      transacoes.map((t) => ({
        id: t.id as string,
        tipo: t.tipo as string,
        valor: t.valor as number | null,
        artista_id: t.artista_id as string | null,
        projeto_id: t.projeto_id as string | null,
        data: t.data as string | null,
      })),
    );

    // 3. Calcular P&L por artista
    const plPorArtista = calcularPLPorArtista(
      artistas.map((a) => ({
        id: a.id as string,
        nome_artistico: a.nome_artistico as string | null,
        nome: a.nome as string | null,
      })),
      transacoes.map((t) => ({
        id: t.id as string,
        tipo: t.tipo as string,
        valor: t.valor as number | null,
        artista_id: t.artista_id as string | null,
        projeto_id: t.projeto_id as string | null,
        data: t.data as string | null,
      })),
    );

    // 4. Calcular recoupments
    const recoupments = calcularRecoupments(
      contratos.map((c) => ({
        id: c.id as string,
        titulo: c.titulo as string | null,
        artista_id: c.artista_id as string | null,
        valor: c.valor as number | null,
        data_inicio: c.data_inicio as string | null,
      })),
      artistas.map((a) => ({
        id: a.id as string,
        nome_artistico: a.nome_artistico as string | null,
        nome: a.nome as string | null,
      })),
      transacoes.map((t) => ({
        id: t.id as string,
        tipo: t.tipo as string,
        valor: t.valor as number | null,
        artista_id: t.artista_id as string | null,
        projeto_id: t.projeto_id as string | null,
        data: t.data as string | null,
      })),
    );

    return {
      plPorProjeto,
      plPorArtista,
      recoupments,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof DomainError) throw err;
    throw new DomainError(
      `Falha ao gerar relatório P&L: ${err instanceof Error ? err.message : String(err)}`,
      "PL_GENERATION_FAILED",
    );
  }
}
