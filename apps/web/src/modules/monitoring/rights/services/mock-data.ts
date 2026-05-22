import type { RightsExecution, BroadcastDetection, CueSheet, Setlist, EcadImport, EcadPeriodo, ExecucaoTimelineEvent, EcadHistoricoISRC } from "../types";

export const MOCK_EXECUCOES_PUBLICAS: RightsExecution[] = [
  { id: "re-001", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", origem: "Rádio Globo FM", tipo_execucao: "radio_fm", data_hora: "2026-05-08T14:32:00", match_ecad: true, valor_estimado: 18.50, status: "confirmado" },
  { id: "re-002", obra_titulo: "Beira do Rio", artista: "Grupo Raiz Nordestina", isrc: "BRMSC2500002", origem: "TV Globo", tipo_execucao: "tv_aberta", data_hora: "2026-05-08T21:05:00", match_ecad: true, valor_estimado: 124.00, status: "confirmado" },
  { id: "re-003", obra_titulo: "Frequência 440", artista: "DJ Marcus Flow", isrc: "BRMSC2500003", origem: "Multishow", tipo_execucao: "tv_fechada", data_hora: "2026-05-07T23:15:00", match_ecad: false, valor_estimado: 87.50, status: "divergencia" },
  { id: "re-004", obra_titulo: "Amor de Interior", artista: "Ana Beatriz Santos", isrc: "BRMSC2500004", origem: "Rádio Nacional AM", tipo_execucao: "radio_am", data_hora: "2026-05-07T10:20:00", match_ecad: true, valor_estimado: 9.20, status: "confirmado" },
  { id: "re-005", obra_titulo: "Suíte Brasileira nº 1", artista: "Trio Bossa Moderna", isrc: "BRMSC2500005", origem: "Show Ao Vivo — SP", tipo_execucao: "show_ao_vivo", data_hora: "2026-05-06T22:00:00", match_ecad: true, valor_estimado: 560.00, status: "pendente" },
  { id: "re-006", obra_titulo: "Cidade Mágica", artista: "Vitória Lunar", isrc: "BRMSC2500006", origem: "Web Rádio Samba Brasil", tipo_execucao: "web_radio", data_hora: "2026-05-06T16:45:00", match_ecad: false, valor_estimado: 4.10, status: "nao_reportado" },
  { id: "re-007", obra_titulo: "Xote da Saudade", artista: "Grupo Raiz Nordestina", isrc: "BRMSC2500007", origem: "Casa Noturna Via Music", tipo_execucao: "casa_noturna", data_hora: "2026-05-05T23:55:00", match_ecad: true, valor_estimado: 32.00, status: "pendente" },
  { id: "re-008", obra_titulo: "Trap do Norte", artista: "Pedro Breaks", isrc: "BRMSC2500008", origem: "Festival Rec Beat", tipo_execucao: "evento", data_hora: "2026-05-04T20:30:00", match_ecad: false, valor_estimado: 210.00, status: "nao_reportado" },
  { id: "re-009", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", origem: "Rádio Transamérica", tipo_execucao: "radio_fm", data_hora: "2026-05-04T08:00:00", match_ecad: true, valor_estimado: 18.50, status: "confirmado" },
  { id: "re-010", obra_titulo: "Amor de Interior", artista: "Ana Beatriz Santos", isrc: "BRMSC2500004", origem: "TV Cultura", tipo_execucao: "tv_aberta", data_hora: "2026-05-03T15:30:00", match_ecad: true, valor_estimado: 98.00, status: "confirmado" },
  { id: "re-011", obra_titulo: "Track Desconhecida", artista: "Artista Desconhecido", isrc: "BRMSC2599998", origem: "Web Rádio Hits Brasil", tipo_execucao: "web_radio", data_hora: "2026-05-02T11:20:00", match_ecad: false, valor_estimado: 3.50, status: "nao_reportado" },
];

export const MOCK_BROADCAST_DETECTIONS: BroadcastDetection[] = [
  { id: "bd-001", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", emissora: "Rádio Globo", canal: "FM 98.1", tipo: "radio", data_hora: "2026-05-08T14:32:00", duracao_segundos: 222, valor_estimado: 18.50, status: "confirmado" },
  { id: "bd-002", obra_titulo: "Beira do Rio", artista: "Grupo Raiz Nordestina", isrc: "BRMSC2500002", emissora: "TV Globo", canal: "Canal 4", tipo: "tv", data_hora: "2026-05-08T21:05:00", duracao_segundos: 255, valor_estimado: 124.00, status: "confirmado" },
  { id: "bd-003", obra_titulo: "Frequência 440", artista: "DJ Marcus Flow", isrc: "BRMSC2500003", emissora: "Multishow", canal: "Cabo 34", tipo: "tv", data_hora: "2026-05-07T23:15:00", duracao_segundos: 330, valor_estimado: 87.50, status: "divergencia" },
  { id: "bd-004", obra_titulo: "Cidade Mágica", artista: "Vitória Lunar", isrc: "BRMSC2500006", emissora: "Web Rádio Samba Brasil", canal: "Online", tipo: "web_radio", data_hora: "2026-05-06T16:45:00", duracao_segundos: 205, valor_estimado: 4.10, status: "nao_reportado" },
];

export const MOCK_CUE_SHEETS: CueSheet[] = [
  {
    id: "cs-001", producao: "Novela Terra e Mar", canal: "TV Globo", episodio: "Ep. 45", data_exibicao: "2026-05-01", status: "aprovado",
    obras: [
      { obra_titulo: "Noite de Luz", isrc: "BRMSC2500001", compositor: "Vitória Carvalho", publisher: "MusicOS Publishing", duracao_segundos: 90, tipo_uso: "tema" },
      { obra_titulo: "Amor de Interior", isrc: "BRMSC2500004", compositor: "Ana Beatriz Santos", publisher: "MusicOS Publishing", duracao_segundos: 45, tipo_uso: "incidental" },
    ],
  },
  {
    id: "cs-002", producao: "Documentário Nordeste Vivo", canal: "Canal Futura", episodio: undefined, data_exibicao: "2026-04-20", status: "pendente",
    obras: [
      { obra_titulo: "Beira do Rio", isrc: "BRMSC2500002", compositor: "Grupo Raiz Nordestina", publisher: "MusicOS Publishing", duracao_segundos: 180, tipo_uso: "trilha" },
    ],
  },
];

export const MOCK_SETLISTS: Setlist[] = [
  {
    id: "sl-001", artista: "Vitória Lunar", evento: "Festival Lollapalooza Brasil", local: "Autódromo de Interlagos, SP", data: "2026-03-28", status: "confirmado",
    musicas: [
      { ordem: 1, obra_titulo: "Noite de Luz", isrc: "BRMSC2500001", compositor: "Vitória Carvalho", duracao_segundos: 222 },
      { ordem: 2, obra_titulo: "Cidade Mágica", isrc: "BRMSC2500006", compositor: "Vitória Carvalho", duracao_segundos: 205 },
    ],
  },
  {
    id: "sl-002", artista: "Grupo Raiz Nordestina", evento: "Forró no Parque", local: "Parque da Cidade, Fortaleza", data: "2026-04-15", status: "enviado",
    musicas: [
      { ordem: 1, obra_titulo: "Beira do Rio", isrc: "BRMSC2500002", compositor: "Grupo Raiz Nordestina", duracao_segundos: 255 },
      { ordem: 2, obra_titulo: "Xote da Saudade", isrc: "BRMSC2500007", compositor: "Grupo Raiz Nordestina", duracao_segundos: 242 },
    ],
  },
];

export const MOCK_ECAD_IMPORTS: EcadImport[] = [
  { id: "ei-001", arquivo: "ECAD_Q1_2026.xlsx", periodo: "2026-Q1", data_importacao: "2026-04-10", total_execucoes: 1847, total_obras: 23, valor_total: 15670.90, status: "processado", linhas_ok: 1847, linhas_erro: 0 },
  { id: "ei-002", arquivo: "ECAD_Q4_2025.xlsx", periodo: "2025-Q4", data_importacao: "2026-01-15", total_execucoes: 1523, total_obras: 19, valor_total: 12450.00, status: "processado", linhas_ok: 1520, linhas_erro: 3 },
  { id: "ei-003", arquivo: "ECAD_Q3_2025.xlsx", periodo: "2025-Q3", data_importacao: "2025-10-12", total_execucoes: 1102, total_obras: 16, valor_total: 9870.50, status: "processado", linhas_ok: 1102, linhas_erro: 0 },
];

export const MOCK_ECAD_PERIODOS: EcadPeriodo[] = [
  { id: "ecad-001", periodo: "2026-Q1", valor_total: 15670.90, status: "recebido", data_referencia: "2026-03-31", observacoes: "Recebimentos externos de direitos de execução pública Q1/2026" },
  { id: "ecad-002", periodo: "2025-Q4", valor_total: 12450.00, status: "recebido", data_referencia: "2025-12-31", observacoes: "Recebimentos externos de direitos de execução pública Q4/2025" },
  { id: "ecad-003", periodo: "2025-Q3", valor_total: 9870.50, status: "recebido", data_referencia: "2025-09-30", observacoes: "Recebimentos externos de direitos de execução pública Q3/2025" },
  { id: "ecad-004", periodo: "2026-Q2", valor_total: 0, status: "pendente", data_referencia: "2026-06-30", observacoes: "Aguardando apuração" },
];

/**
 * Timeline keyed by ISRC (work identity), NOT execution ID.
 * This ensures that clicking detail on any execution of the same work
 * always shows the same unified, complete history.
 */
export const MOCK_TIMELINE_BY_ISRC: Record<string, ExecucaoTimelineEvent[]> = {
  // BRMSC2500001 — "Noite de Luz" (Vitória Lunar) — appears as re-001 and re-009
  "BRMSC2500001": [
    { id: "tl-isrc1-1",  data_hora: "2026-05-08T15:00:00", tipo: "envio_ecad",        descricao: "Execução reportada ao ECAD automaticamente",              usuario: "Sistema" },
    { id: "tl-isrc1-2",  data_hora: "2026-05-08T14:45:00", tipo: "confirmacao_ecad",  descricao: "Match confirmado com base ECAD",                          detalhe: "ISRC BRMSC2500001 encontrado no catálogo ECAD", origem: "ECAD API" },
    { id: "tl-isrc1-3",  data_hora: "2026-05-08T14:32:00", tipo: "deteccao",          descricao: "Detecção automática via fingerprinting",                  detalhe: "Rádio Globo FM · FM 98.1 · duração 3:42", origem: "SoundScan API" },
    { id: "tl-isrc1-4",  data_hora: "2026-05-04T08:15:00", tipo: "confirmacao_ecad",  descricao: "Match confirmado com base ECAD",                          origem: "ECAD API" },
    { id: "tl-isrc1-5",  data_hora: "2026-05-04T08:00:00", tipo: "deteccao",          descricao: "Detecção automática via fingerprinting",                  detalhe: "Rádio Transamérica · FM 100.1 · duração 3:42", origem: "SoundScan API" },
    { id: "tl-isrc1-6",  data_hora: "2026-04-20T11:00:00", tipo: "arrecadacao",       descricao: "Arrecadação ECAD Q1/2026 creditada",                      valor: 215.40, detalhe: "Total de 34 execuções no período", origem: "ECAD" },
    { id: "tl-isrc1-7",  data_hora: "2026-03-15T09:00:00", tipo: "deteccao",          descricao: "Detecção automática via fingerprinting",                  detalhe: "Rádio Globo FM · FM 98.1 · duração 3:42", origem: "SoundScan API" },
    { id: "tl-isrc1-8",  data_hora: "2026-01-10T14:00:00", tipo: "vinculo_catalogo",  descricao: "Obra vinculada ao catálogo interno",                      detalhe: "Obra ID: OBR-2025-0042", usuario: "Ana Carvalho" },
  ],
  // BRMSC2500002 — "Beira do Rio" (Grupo Raiz Nordestina)
  "BRMSC2500002": [
    { id: "tl-isrc2-1", data_hora: "2026-05-08T21:20:00", tipo: "confirmacao_ecad", descricao: "Match confirmado com base ECAD",                         origem: "ECAD API" },
    { id: "tl-isrc2-2", data_hora: "2026-05-08T21:05:00", tipo: "deteccao",         descricao: "Detecção automática via fingerprinting",                 detalhe: "TV Globo · Canal 4 · duração 4:15", origem: "ContentID" },
    { id: "tl-isrc2-3", data_hora: "2026-04-20T11:00:00", tipo: "arrecadacao",      descricao: "Arrecadação ECAD Q1/2026 creditada",                     valor: 987.20, detalhe: "Total de 28 execuções no período", origem: "ECAD" },
    { id: "tl-isrc2-4", data_hora: "2026-03-22T18:30:00", tipo: "deteccao",         descricao: "Detecção automática via fingerprinting",                 detalhe: "TV Globo · Canal 4 · novela", origem: "ContentID" },
  ],
  // BRMSC2500003 — "Frequência 440" (DJ Marcus Flow)
  "BRMSC2500003": [
    { id: "tl-isrc3-1", data_hora: "2026-05-08T09:00:00", tipo: "envio_ecad",       descricao: "Notificação de divergência enviada ao ECAD",              usuario: "Sistema" },
    { id: "tl-isrc3-2", data_hora: "2026-05-07T23:30:00", tipo: "divergencia_aberta",descricao: "Divergência detectada: ISRC não encontrado na base ECAD",detalhe: "ISRC BRMSC2500003 retornou 0 registros", origem: "ECAD API" },
    { id: "tl-isrc3-3", data_hora: "2026-05-07T23:15:00", tipo: "deteccao",         descricao: "Detecção automática via fingerprinting",                 detalhe: "Multishow · Cabo 34 · duração 5:30", origem: "ContentID" },
  ],
  // BRMSC2500004 — "Amor de Interior" (Ana Beatriz Santos) — appears as re-004 and re-010
  "BRMSC2500004": [
    { id: "tl-isrc4-1", data_hora: "2026-05-07T10:35:00", tipo: "confirmacao_ecad", descricao: "Match confirmado com base ECAD",                         origem: "ECAD API" },
    { id: "tl-isrc4-2", data_hora: "2026-05-07T10:20:00", tipo: "deteccao",         descricao: "Detecção automática via fingerprinting",                 detalhe: "Rádio Nacional AM · AM 980 · duração 3:10", origem: "SoundScan API" },
    { id: "tl-isrc4-3", data_hora: "2026-05-03T15:45:00", tipo: "confirmacao_ecad", descricao: "Match confirmado com base ECAD",                         origem: "ECAD API" },
    { id: "tl-isrc4-4", data_hora: "2026-05-03T15:30:00", tipo: "deteccao",         descricao: "Detecção automática via fingerprinting",                 detalhe: "TV Cultura · Canal 2 · duração 3:10", origem: "ContentID" },
    { id: "tl-isrc4-5", data_hora: "2026-04-20T11:00:00", tipo: "arrecadacao",      descricao: "Arrecadação ECAD Q1/2026 creditada",                     valor: 312.80, detalhe: "Total de 41 execuções no período", origem: "ECAD" },
  ],
  // BRMSC2500005 — "Suíte Brasileira nº 1" (Trio Bossa Moderna)
  "BRMSC2500005": [
    { id: "tl-isrc5-1", data_hora: "2026-05-06T23:30:00", tipo: "envio_ecad",       descricao: "Setlist enviado ao ECAD para processamento",              usuario: "Carlos Mendes" },
    { id: "tl-isrc5-2", data_hora: "2026-05-06T22:00:00", tipo: "deteccao",         descricao: "Setlist registrado — Show Ao Vivo",                      detalhe: "Show Ao Vivo — São Paulo · Auditório Ibirapuera", origem: "Setlist Manual" },
  ],
  // BRMSC2500006 — "Cidade Mágica" (Vitória Lunar)
  "BRMSC2500006": [
    { id: "tl-isrc6-1", data_hora: "2026-05-06T17:00:00", tipo: "divergencia_aberta",descricao: "Sem match ECAD — web rádio não cadastrada",              detalhe: "Web Rádio Samba Brasil não consta no cadastro ECAD", origem: "ECAD API" },
    { id: "tl-isrc6-2", data_hora: "2026-05-06T16:45:00", tipo: "deteccao",         descricao: "Detecção automática via fingerprinting",                 detalhe: "Web Rádio Samba Brasil · Online · duração 3:25", origem: "SoundScan API" },
  ],
  // BRMSC2500007 — "Xote da Saudade" (Grupo Raiz Nordestina)
  "BRMSC2500007": [
    { id: "tl-isrc7-1", data_hora: "2026-05-06T09:00:00", tipo: "envio_ecad",       descricao: "Setlist enviado ao ECAD para processamento",              usuario: "Carlos Mendes" },
    { id: "tl-isrc7-2", data_hora: "2026-05-05T23:55:00", tipo: "deteccao",         descricao: "Setlist registrado — Casa Noturna",                      detalhe: "Casa Noturna Via Music · São Paulo", origem: "Setlist Manual" },
  ],
  // BRMSC2500008 — "Trap do Norte" (Pedro Breaks)
  "BRMSC2500008": [
    { id: "tl-isrc8-1", data_hora: "2026-05-04T20:30:00", tipo: "deteccao",         descricao: "Setlist registrado — Evento",                            detalhe: "Festival Rec Beat · Recife, PE", origem: "Setlist Manual" },
  ],
};

export const MOCK_ECAD_HISTORICO_ISRC: Record<string, EcadHistoricoISRC[]> = {
  "BRMSC2500001": [
    { id: "eh-001-1", isrc: "BRMSC2500001", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 34, valor_arrecadado: 215.40, status: "recebido", distribuidora: "ECAD", observacoes: "34 execuções em rádio FM" },
    { id: "eh-001-2", isrc: "BRMSC2500001", periodo: "2025-Q4", data_referencia: "2025-12-31", total_execucoes: 28, valor_arrecadado: 178.20, status: "recebido", distribuidora: "ECAD", observacoes: "28 execuções em rádio e TV" },
    { id: "eh-001-3", isrc: "BRMSC2500001", periodo: "2025-Q3", data_referencia: "2025-09-30", total_execucoes: 19, valor_arrecadado: 124.60, status: "recebido", distribuidora: "ECAD" },
    { id: "eh-001-4", isrc: "BRMSC2500001", periodo: "2026-Q2", data_referencia: "2026-06-30", total_execucoes: 0, valor_arrecadado: 0, status: "pendente", observacoes: "Aguardando apuração" },
  ],
  "BRMSC2500002": [
    { id: "eh-002-1", isrc: "BRMSC2500002", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 28, valor_arrecadado: 987.20, status: "recebido", distribuidora: "ECAD", observacoes: "Execuções em TV aberta — alto valor unitário" },
    { id: "eh-002-2", isrc: "BRMSC2500002", periodo: "2025-Q4", data_referencia: "2025-12-31", total_execucoes: 22, valor_arrecadado: 756.80, status: "recebido", distribuidora: "ECAD" },
    { id: "eh-002-3", isrc: "BRMSC2500002", periodo: "2026-Q2", data_referencia: "2026-06-30", total_execucoes: 0, valor_arrecadado: 0, status: "pendente" },
  ],
  "BRMSC2500003": [
    { id: "eh-003-1", isrc: "BRMSC2500003", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 0, valor_arrecadado: 0, status: "divergencia", observacoes: "ISRC não encontrado na base ECAD — aguardando regularização" },
    { id: "eh-003-2", isrc: "BRMSC2500003", periodo: "2025-Q4", data_referencia: "2025-12-31", total_execucoes: 0, valor_arrecadado: 0, status: "divergencia", observacoes: "Sem registro ECAD" },
  ],
  "BRMSC2500004": [
    { id: "eh-004-1", isrc: "BRMSC2500004", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 41, valor_arrecadado: 312.80, status: "recebido", distribuidora: "ECAD", observacoes: "Execuções em rádio AM e TV" },
    { id: "eh-004-2", isrc: "BRMSC2500004", periodo: "2025-Q4", data_referencia: "2025-12-31", total_execucoes: 35, valor_arrecadado: 267.50, status: "recebido", distribuidora: "ECAD" },
    { id: "eh-004-3", isrc: "BRMSC2500004", periodo: "2025-Q3", data_referencia: "2025-09-30", total_execucoes: 27, valor_arrecadado: 210.30, status: "recebido", distribuidora: "ECAD" },
    { id: "eh-004-4", isrc: "BRMSC2500004", periodo: "2026-Q2", data_referencia: "2026-06-30", total_execucoes: 0, valor_arrecadado: 0, status: "pendente" },
  ],
  "BRMSC2500005": [
    { id: "eh-005-1", isrc: "BRMSC2500005", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 3, valor_arrecadado: 1680.00, status: "pendente", observacoes: "Setlist show ao vivo em processamento ECAD" },
  ],
  "BRMSC2500006": [
    { id: "eh-006-1", isrc: "BRMSC2500006", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 0, valor_arrecadado: 0, status: "divergencia", observacoes: "Web rádio não cadastrada no ECAD" },
  ],
  "BRMSC2500007": [
    { id: "eh-007-1", isrc: "BRMSC2500007", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 1, valor_arrecadado: 32.00, status: "pendente", observacoes: "Casa noturna — aguardando confirmação" },
  ],
  "BRMSC2500008": [
    { id: "eh-008-1", isrc: "BRMSC2500008", periodo: "2026-Q1", data_referencia: "2026-03-31", total_execucoes: 0, valor_arrecadado: 0, status: "divergencia", observacoes: "Obra não reportada ao ECAD" },
  ],
};
