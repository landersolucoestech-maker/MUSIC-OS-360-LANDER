/**
 * shared/types/enums.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Literal union types para todos os campos enumerados do sistema MUSIC OS 360.
 * Fonte única de verdade — todos os módulos devem importar daqui.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Artista ──────────────────────────────────────────────────────────────────

export type ArtistaStatus =
  | "contratado"
  | "ativo"
  | "inativo"
  | "prospecto"
  | "desligado"
  | "suspenso"
  | "ex_artista";

export type ArtistaTipo =
  | "artista_solo"
  | "banda"
  | "duo"
  | "trio"
  | "grupo"
  | "coletivo";

export type ArtistaTipoPerfil =
  | "independente"
  | "com_empresario"
  | "gravadora"
  | "editora";

export type ArtistaEspecialidade =
  | "dj"
  | "dj_produtor"
  | "compositor_autor"
  | "interprete"
  | "produtor";

// ── Contrato ─────────────────────────────────────────────────────────────────

export type ContratoStatus =
  | "ativo"
  | "vigente"
  | "vencendo"
  | "vencido"
  | "encerrado"
  | "rascunho"
  | "aguardando_assinatura"
  | "cancelado";

export type ContratoTipo =
  | "exclusivo"
  | "nao_exclusivo"
  | "licenciamento"
  | "distribuicao"
  | "producao"
  | "representacao"
  | "parceria"
  | "servicos"
  | "gestao"
  | "outro";

// ── Transação / Accounting ────────────────────────────────────────────────────

export type TransacaoTipo = "receita" | "despesa";

export type TransacaoStatus =
  | "pendente"
  | "concluido"
  | "cancelado"
  | "agendado";

export type TransacaoFormaPagamento =
  | "dinheiro"
  | "pix"
  | "ted"
  | "boleto"
  | "cartao_credito"
  | "cartao_debito"
  | "cheque"
  | "permuta"
  | "outro";

// ── Nota Fiscal ──────────────────────────────────────────────────────────────

export type NotaFiscalStatus =
  | "rascunho"
  | "pendente"
  | "emitida"
  | "cancelada"
  | "rejeitada";

export type NotaFiscalTipo =
  | "nfs"
  | "nfe"
  | "nfce"
  | "nfse"
  | "recibo"
  | "outro";

// ── Obra / Catálogo ──────────────────────────────────────────────────────────

export type ObraStatus =
  | "pendente"
  | "analise"
  | "registrado"
  | "ativo"
  | "inativo"
  | "arquivado";

export type ObraTipo =
  | "musica"
  | "letra"
  | "trilha"
  | "jingle"
  | "instrumental"
  | "sampledTrack"
  | "outro";

// ── Fonograma ────────────────────────────────────────────────────────────────

export type FonogramaStatus =
  | "pendente"
  | "analise"
  | "registrado"
  | "ativo"
  | "inativo";

// ── Lançamento ────────────────────────────────────────────────────────────────

export type LancamentoTipo =
  | "single"
  | "ep"
  | "album"
  | "compilacao"
  | "live"
  | "outro";

export type LancamentoStatus =
  | "analise"
  | "aprovado"
  | "entregue"
  | "publicado"
  | "arquivado"
  | "cancelado";

// ── Share / Participação ──────────────────────────────────────────────────────

export type ShareTipo =
  | "composicao"
  | "master"
  | "editorial"
  | "performance"
  | "sincronia"
  | "outro";

export type ShareStatus =
  | "ativo"
  | "inativo"
  | "pendente"
  | "liquidado";

export type ShareDirecao = "entrada" | "saida";

// ── CRM / Lead ────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "novo"
  | "em_contato"
  | "proposta"
  | "negociacao"
  | "fechado"
  | "perdido"
  | "inativo";

export type LeadPrioridade = "alta" | "media" | "baixa";

export type LeadTemperatura = "quente" | "morno" | "frio";

export type ClienteStatus = "ativo" | "inativo" | "prospecto";

export type ClienteSegmento =
  | "artista"
  | "gravadora"
  | "editora"
  | "distribuidora"
  | "agencia"
  | "marca"
  | "produtor"
  | "veiculo"
  | "outro";

// ── Evento ────────────────────────────────────────────────────────────────────

export type EventoTipo =
  | "show"
  | "festival"
  | "gravacao"
  | "videoclipe"
  | "ensaio"
  | "reuniao"
  | "workshop"
  | "lancamento"
  | "live"
  | "streaming"
  | "outro";

export type EventoStatus =
  | "planejado"
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "adiado";

// ── Projeto ───────────────────────────────────────────────────────────────────

export type ProjetoStatus =
  | "planejamento"
  | "producao"
  | "pos_producao"
  | "concluido"
  | "cancelado"
  | "pausado";

export type ProjetoTipo =
  | "album"
  | "ep"
  | "single"
  | "videoclipe"
  | "show"
  | "tour"
  | "campanha"
  | "podcast"
  | "outro";

// ── Marketing ─────────────────────────────────────────────────────────────────

export type CampanhaStatus =
  | "planejamento"
  | "ativa"
  | "pausada"
  | "concluida"
  | "cancelada";

export type CampanhaTipo =
  | "digital"
  | "impressa"
  | "outdoor"
  | "radio"
  | "tv"
  | "influencer"
  | "email"
  | "sms"
  | "push"
  | "release"
  | "outro";

export type ConteudoStatus =
  | "rascunho"
  | "revisao"
  | "aprovado"
  | "agendado"
  | "publicado"
  | "arquivado";

// ── RH ────────────────────────────────────────────────────────────────────────

export type FuncionarioStatus =
  | "ativo"
  | "inativo"
  | "ferias"
  | "licenca"
  | "demitido";

export type FuncionarioTipoContrato =
  | "clt"
  | "pj"
  | "autonomo"
  | "estagio"
  | "temporario";

export type FeriasAusenciaTipo =
  | "ferias"
  | "licenca_medica"
  | "licenca_maternidade"
  | "licenca_paternidade"
  | "falta"
  | "outro";

export type FeriasAusenciaStatus = "pendente" | "aprovado" | "rejeitado" | "concluido";

// ── Inventário ────────────────────────────────────────────────────────────────

export type InventarioStatus =
  | "disponivel"
  | "em_uso"
  | "manutencao"
  | "descartado"
  | "emprestado";

// ── Licença ───────────────────────────────────────────────────────────────────

export type LicencaTipo =
  | "sincronia"
  | "mecanica"
  | "performance"
  | "impressao"
  | "digital"
  | "streaming"
  | "outro";

export type LicencaStatus =
  | "ativo"
  | "pendente"
  | "vencido"
  | "cancelado"
  | "encerrado";

// ── Monitoramento / Takedown ──────────────────────────────────────────────────

export type TakedownStatus =
  | "pendente"
  | "enviado"
  | "processando"
  | "concluido"
  | "rejeitado"
  | "falhou";
