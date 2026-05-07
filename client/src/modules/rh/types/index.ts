/**
 * Tipos canônicos do módulo rh.
 * Constantes de domínio (SETORES, TIPOS_CONTRATO, etc.) vivem em rh/domain/funcionario.rules.ts.
 */
export type {
  Funcionario,
  FuncionarioInsert,
  FuncionarioUpdate,
} from "../hooks/useFuncionarios";

export type {
  FeriasAusencia,
  FeriasAusenciaInsert,
  FeriasAusenciaUpdate,
} from "../hooks/useFeriasAusencias";

export type {
  DocumentoFuncionario,
  DocumentoFuncionarioInsert,
  DocumentoFuncionarioUpdate,
} from "../hooks/useDocumentosFuncionario";
