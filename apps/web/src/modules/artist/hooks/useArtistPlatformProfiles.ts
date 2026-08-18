import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";

export type SocialPlatform = "spotify" | "youtube" | "deezer" | "soundcloud";
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
