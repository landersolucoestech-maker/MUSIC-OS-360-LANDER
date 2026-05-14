import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';

const YT_API = 'https://www.googleapis.com/youtube/v3';

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('YOUTUBE_API_KEY');
  }

  private get apiKey(): string {
    return this.config.get<string>('YOUTUBE_API_KEY') ?? '';
  }

  async getChannelStats(channelId: string) {
    if (!this.apiKey) return { error: 'YOUTUBE_API_KEY não configurado' };
    const res = await fetch(
      `${YT_API}/channels?part=statistics,snippet&id=${channelId}&key=${this.apiKey}`,
    );
    if (!res.ok) return { error: `YouTube API error: ${res.status}` };
    const data = await res.json() as any;
    const item = data.items?.[0];
    if (!item) return { error: 'Canal não encontrado' };
    return {
      channelId,
      title:        item.snippet?.title ?? '',
      description:  item.snippet?.description ?? '',
      thumbnail:    item.snippet?.thumbnails?.default?.url ?? '',
      subscribers:  Number(item.statistics?.subscriberCount ?? 0),
      views:        Number(item.statistics?.viewCount ?? 0),
      videoCount:   Number(item.statistics?.videoCount ?? 0),
      syncedAt:     new Date().toISOString(),
    };
  }

  async getVideoStats(videoId: string) {
    if (!this.apiKey) return { error: 'YOUTUBE_API_KEY não configurado' };
    const res = await fetch(
      `${YT_API}/videos?part=statistics,snippet&id=${videoId}&key=${this.apiKey}`,
    );
    if (!res.ok) return { error: `YouTube API error: ${res.status}` };
    const data = await res.json() as any;
    const item = data.items?.[0];
    if (!item) return { error: 'Vídeo não encontrado' };
    return {
      videoId,
      title:        item.snippet?.title ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      publishedAt:  item.snippet?.publishedAt ?? '',
      views:        Number(item.statistics?.viewCount ?? 0),
      likes:        Number(item.statistics?.likeCount ?? 0),
      comments:     Number(item.statistics?.commentCount ?? 0),
      syncedAt:     new Date().toISOString(),
    };
  }

  async searchVideos(query: string, limit = 10) {
    if (!this.apiKey) return [];
    const res = await fetch(
      `${YT_API}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${limit}&key=${this.apiKey}`,
    );
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.items ?? []).map((item: any) => ({
      videoId:      item.id?.videoId ?? '',
      title:        item.snippet?.title ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      publishedAt:  item.snippet?.publishedAt ?? '',
      thumbnail:    item.snippet?.thumbnails?.default?.url ?? '',
    }));
  }
}
