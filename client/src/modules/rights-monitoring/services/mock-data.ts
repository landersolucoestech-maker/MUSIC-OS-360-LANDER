import type { RightsExecution, BroadcastDetection, CueSheet, Setlist, EcadImport, EcadPeriodo } from "../types";

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
  { id: "ecad-001", periodo: "2026-Q1", valor_total: 15670.90, status: "recebido", data_referencia: "2026-03-31", observacoes: "Royalties de execução pública Q1/2026" },
  { id: "ecad-002", periodo: "2025-Q4", valor_total: 12450.00, status: "recebido", data_referencia: "2025-12-31", observacoes: "Royalties de execução pública Q4/2025" },
  { id: "ecad-003", periodo: "2025-Q3", valor_total: 9870.50, status: "recebido", data_referencia: "2025-09-30", observacoes: "Royalties de execução pública Q3/2025" },
  { id: "ecad-004", periodo: "2026-Q2", valor_total: 0, status: "pendente", data_referencia: "2026-06-30", observacoes: "Aguardando apuração" },
];
