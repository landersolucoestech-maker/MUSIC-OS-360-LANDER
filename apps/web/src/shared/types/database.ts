/**
 * Tipos base de banco de dados — modo standalone.
 *
 * Tipos base para o modo standalone. O app opera 100% com
 * MOCK_DATA (localStorage). Cada hook de domínio declara os campos
 * concretos em sua própria interface usando interseção com esses aliases
 * (ex: `Tables<"artistas"> & { nome_artistico?: string }`).
 *
 * `Tables<T>` é um type base vazio (`object`) que, ao ser intersectado
 * com os campos específicos do hook, resulta exatamente nesses campos
 * sem vazar `unknown` para os acessos. Isso elimina a necessidade de
 * `any` e mantém segurança de tipos nos componentes consumidores.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Tables<_T extends string = string> = object;
export type TablesInsert<_T extends string = string> = object;
export type TablesUpdate<_T extends string = string> = object;

/**
 * Tipo base para linhas do MOCK_DATA — usado em generics do hook CRUD.
 * Provê a assinatura de índice necessária internamente sem vazá-la para
 * os tipos de domínio.
 */
export type MockRow = { [key: string]: unknown };
