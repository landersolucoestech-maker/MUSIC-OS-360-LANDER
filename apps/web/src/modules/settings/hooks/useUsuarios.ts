import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { api } from "@/shared/lib/api-client";
import { useAuth } from "@/app/providers/AuthContext";

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

interface ApiUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  role_slug?: string | null;
  cargo?: string | null;
  is_active: boolean;
  created_at: string;
}

interface UsersPage {
  data: ApiUser[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

function mapUser(user: ApiUser): Usuario {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone ?? null,
    avatar_url: user.avatar_url ?? null,
    role: user.role_slug ?? user.role ?? "viewer",
    cargo: user.cargo ?? null,
    status: user.is_active ? "ativo" : "inativo",
    created_at: user.created_at,
  };
}

export function useUsuarios() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading, error } = useQuery<Usuario[]>({
    queryKey: [...QUERY_KEYS.USUARIOS],
    queryFn: async () => {
      const page = await api.get<UsersPage>("/users?limit=100&offset=0");
      return (page.data ?? []).map(mapUser);
    },
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
      await api.patch(`/users/${id}`, {
        ...(full_name !== undefined && { fullName: full_name }),
        ...(phone !== undefined && { phone }),
        ...(cargo !== undefined && { role: cargo }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.USUARIOS] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Usuário atualizado com sucesso!");
    },
    onError: (mutationError: Error) => {
      toast.error(`Erro ao atualizar usuário: ${mutationError.message}`);
    },
  });

  return {
    usuarios,
    isLoading,
    error,
    updateUsuario,
    currentUserId: user?.id ?? "",
  };
}
