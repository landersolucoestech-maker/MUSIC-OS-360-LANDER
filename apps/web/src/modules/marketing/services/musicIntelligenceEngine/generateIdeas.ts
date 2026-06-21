import type { ArtistProfileContext, ReleaseContext } from "./types";

export function buildIdeaContext(artistContext?: ArtistProfileContext | null, releaseContext?: ReleaseContext | null) {
  return {
    artist: artistContext?.artist.label,
    release: releaseContext?.release.label,
    genre: releaseContext?.genre || artistContext?.predominantGenre,
    audience: artistContext?.publicSignals ?? [],
    recentReleases: artistContext?.catalog.releaseDates.slice(-3) ?? [],
    campaigns: artistContext?.operations.campaigns.map((item) => item.name) ?? [],
    activeChannels: artistContext?.operations.contents.map((item) => item.channel) ?? [],
    compatibleTrends: releaseContext?.diagnosis.editorialTags ?? [],
  };
}

