import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { MOCK_USER_ID } from "@/shared/data/mockData";
import { storage } from "@/shared/lib/storage";

/**
 * Lista de usuários do app. Lê e persiste via storage.ts (abstração de MOCK_DATA).
 * Ao conectar backend real, apenas storage.ts muda — este hook permanece intacto.
 */

export interface Usuario {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  cargo: string | null;
  status: "ativo" | "inativo";
  created_at: string;
}

export function useUsuarios() {
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading, error } = useQuery<Usuario[]>({
    queryKey: [...QUERY_KEYS.USUARIOS],
    queryFn: async () =>
      (await storage.list<Record<string, unknown> & { id: string }>("usuarios")) as unknown as Usuario[],
  });

  const updateUsuario = useMutation({
    mutationFn: async ({
      id,
      full_name,
      phone,
      cargo,
    }: {
      id: string;
      full_name?: string;
      phone?: string;
      cargo?: string;
    }) => {
      const existing = await storage.getById<Record<string, unknown> & { id: string }>("usuarios", id);
      if (!existing) throw new Error(`Usuário ${id} não encontrado`);
      await storage.update<Record<string, unknown> & { id: string }>("usuarios", id, {
        ...(full_name !== undefined && { full_name }),
        ...(phone !== undefined && { phone }),
        ...(cargo !== undefined && { cargo }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.USUARIOS] });
      toast.success("Usuário atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    },
  });

  return {
    usuarios,
    isLoading,
    error,
    updateUsuario,
    currentUserId: MOCK_USER_ID,
  };
}
