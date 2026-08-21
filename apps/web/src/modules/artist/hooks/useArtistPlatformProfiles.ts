import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";

// Espelha SOCIAL_PLATFORMS de apps/api/.../social-platform-sync.types.ts — sem
// pacote compartilhado entre web/api para este contrato ainda, então os 7
// valores são replicados aqui (Métricas 09 fase 3).
export type SocialPlatform =
  | "spotify"
  | "youtube"
  | "deezer"
  | "soundcloud"
  | "instagram"
  | "tiktok"
  | "apple-music";
export type SocialPlatformSyncStatus = "pending" | "success" | "failed" | "skipped";

export interface ArtistPlatformProfileSnapshot {
  tenant_id: string;
  artist_id: string;
  platform: SocialPlatform;
  external_id: string | null;
  external_url: string | null;
  display_name: string | null;
  username: string | null;
  profile_url: string | null;
  image_url: string | null;
  followers: number | null;
  subscribers: number | null;
  monthly_listeners: number | null;
  popularity: number | null;
  total_views: string | null;
  total_videos: number | null;
  total_tracks: number | null;
  total_albums: number | null;
  raw_payload: Record<string, unknown>;
  sync_status: SocialPlatformSyncStatus;
  last_synced_at: string | null;
  last_error: string | null;
}

interface SyncResponse {
  artist_id: string;
  enqueued: Array<{ platform: SocialPlatform; job_id: string }>;
  skipped: Array<{ platform: SocialPlatform; reason: string }>;
}

export interface SyncArtistPlatformProfileInput {
  platform: SocialPlatform;
  profileUrl: string;
  source: "profile_url";
}

export const artistPlatformProfilesKey = (artistId: string | null | undefined) => [
  "artists",
  artistId,
  "platform-profiles",
];

const SYNC_POLL_INTERVAL_MS = 2_000;

export function useArtistPlatformProfiles(artistId: string | null | undefined) {
  return useQuery({
    queryKey: artistPlatformProfilesKey(artistId),
    queryFn: async () => {
      if (!artistId) return [] as ArtistPlatformProfileSnapshot[];
      return api.get<ArtistPlatformProfileSnapshot[]>(`/artists/${artistId}/platform-profiles`);
    },
    enabled: Boolean(artistId),
    retry: false,
    staleTime: 30_000,
    // O worker BullMQ processa o sync fora do request/response do enqueue —
    // sem isto, um snapshot "pending" nunca mais é revalidado e o card fica
    // preso em "Sincronizando" mesmo depois do job terminar no backend
    // (reproduzido: DB vira sync_status=success em ~1s, UI ficava presa por
    // minutos até F5 manual). Poll só enquanto algo estiver pending.
    refetchInterval: (query) => {
      const data = query.state.data as ArtistPlatformProfileSnapshot[] | undefined;
      return data?.some((profile) => profile.sync_status === "pending") ? SYNC_POLL_INTERVAL_MS : false;
    },
  });
}

export function useSyncArtistPlatformProfile(artistId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SyncArtistPlatformProfileInput) => {
      if (!artistId) throw new Error("Artista não informado.");
      return api.post<SyncResponse>(`/artists/${artistId}/platform-profiles/${input.platform}/sync`, {
        profileUrl: input.profileUrl,
        source: input.source,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: artistPlatformProfilesKey(artistId) });
      if (result.enqueued.length > 0) {
        toast.success("Sincronização enfileirada.");
        return;
      }
      const reason = result.skipped[0]?.reason ?? "sem dados para sincronizar";
      toast.info(`Sincronização não iniciada: ${reason}.`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      queryClient.invalidateQueries({ queryKey: artistPlatformProfilesKey(artistId) });
    },
  });
}
