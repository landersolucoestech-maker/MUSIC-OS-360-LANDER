/**
 * Regras de negócio do domínio de Roles/Permissões.
 *
 * Centraliza as permissões padrão do sistema, papéis predefinidos
 * e funções auxiliares de verificação de acesso.
 */
import type { Permission } from "../types";

export const DEFAULT_PERMISSIONS: Omit<Permission, "id" | "created_at">[] = [
  { code: "dashboard:view", label: "Visualizar Dashboard", description: "Acessar o painel principal", category: "Dashboard" },
  { code: "artistas:view", label: "Visualizar Artistas", description: "Listar e ver detalhes de artistas", category: "Artistas" },
  { code: "artistas:create", label: "Criar Artistas", description: "Adicionar novos artistas", category: "Artistas" },
  { code: "artistas:edit", label: "Editar Artistas", description: "Modificar dados de artistas", category: "Artistas" },
  { code: "artistas:delete", label: "Excluir Artistas", description: "Remover artistas do sistema", category: "Artistas" },
  { code: "projetos:view", label: "Visualizar Projetos", description: "Listar e ver detalhes de projetos", category: "Projetos" },
  { code: "projetos:create", label: "Criar Projetos", description: "Adicionar novos projetos", category: "Projetos" },
  { code: "projetos:edit", label: "Editar Projetos", description: "Modificar dados de projetos", category: "Projetos" },
  { code: "projetos:delete", label: "Excluir Projetos", description: "Remover projetos do sistema", category: "Projetos" },
  { code: "contratos:view", label: "Visualizar Contratos", description: "Listar e ver detalhes de contratos", category: "Contratos" },
  { code: "contratos:create", label: "Criar Contratos", description: "Adicionar novos contratos", category: "Contratos" },
  { code: "contratos:edit", label: "Editar Contratos", description: "Modificar dados de contratos", category: "Contratos" },
  { code: "contratos:delete", label: "Excluir Contratos", description: "Remover contratos do sistema", category: "Contratos" },
  { code: "financeiro:view", label: "Visualizar Financeiro", description: "Acessar dados financeiros", category: "Financeiro" },
  { code: "financeiro:create", label: "Criar Transações", description: "Adicionar transações financeiras", category: "Financeiro" },
  { code: "financeiro:edit", label: "Editar Transações", description: "Modificar transações financeiras", category: "Financeiro" },
  { code: "financeiro:delete", label: "Excluir Transações", description: "Remover transações financeiras", category: "Financeiro" },
  { code: "catalogo:view", label: "Visualizar Catálogo", description: "Acessar obras e fonogramas", category: "Catálogo" },
  { code: "catalogo:create", label: "Criar Catálogo", description: "Adicionar obras e fonogramas", category: "Catálogo" },
  { code: "catalogo:edit", label: "Editar Catálogo", description: "Modificar obras e fonogramas", category: "Catálogo" },
  { code: "catalogo:delete", label: "Excluir Catálogo", description: "Remover obras e fonogramas", category: "Catálogo" },
  { code: "marketing:view", label: "Visualizar Marketing", description: "Acessar campanhas de marketing", category: "Marketing" },
  { code: "marketing:create", label: "Criar Campanhas", description: "Adicionar campanhas de marketing", category: "Marketing" },
  { code: "marketing:edit", label: "Editar Campanhas", description: "Modificar campanhas de marketing", category: "Marketing" },
  { code: "marketing:delete", label: "Excluir Campanhas", description: "Remover campanhas de marketing", category: "Marketing" },
  { code: "settings:view", label: "Visualizar Configurações", description: "Acessar configurações do sistema", category: "Configurações" },
  { code: "settings:edit", label: "Editar Configurações", description: "Modificar configurações do sistema", category: "Configurações" },
  { code: "users:view", label: "Visualizar Usuários", description: "Listar membros da equipe", category: "Usuários" },
  { code: "users:invite", label: "Convidar Usuários", description: "Adicionar membros à equipe", category: "Usuários" },
  { code: "users:edit", label: "Editar Usuários", description: "Modificar papéis de usuários", category: "Usuários" },
  { code: "users:delete", label: "Remover Usuários", description: "Remover membros da equipe", category: "Usuários" },
];

/** Papéis padrão do sistema (somente leitura). */
export const SYSTEM_ROLES = {
  OWNER: "tenant_owner",
  ADMIN: "admin",
  MANAGER: "manager",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

/** Verifica se um papel tem acesso de admin ou superior. */
export function isAdminOrAbove(roleName: string): boolean {
  return [SYSTEM_ROLES.OWNER, SYSTEM_ROLES.ADMIN].includes(
    roleName as (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES],
  );
}

/** Verifica se um papel é papel de sistema (não editável). */
export function isSystemRole(isSystem: boolean): boolean {
  return isSystem;
}

/** Agrupa permissões por categoria. */
export function groupPermissionsByCategory(
  permissions: Pick<Permission, "code" | "label" | "category">[],
): Record<string, typeof permissions> {
  return permissions.reduce(
    (acc, perm) => {
      const cat = perm.category || "Geral";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(perm);
      return acc;
    },
    {} as Record<string, typeof permissions>,
  );
}
