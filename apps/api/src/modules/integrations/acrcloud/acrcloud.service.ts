import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import * as crypto            from 'crypto';

export interface ACRCloudResult {
  title?:      string;
  artist?:     string;
  album?:      string;
  isrc?:       string;
  confidence?: number;
}

@Injectable()
export class ACRCloudService {
  private readonly logger = new Logger(ACRCloudService.name);

  constructor(private readonly config: ConfigService) {}

  private buildSignature(method: string, uri: string, timestamp: number): string {
    const secret = this.config.get<string>('ACRCLOUD_ACCESS_SECRET') ?? '';
    const key    = this.config.get<string>('ACRCLOUD_ACCESS_KEY')    ?? '';
    const stringToSign = [method, uri, key, 'audio', '1', String(timestamp)].join('\n');
    return crypto.createHmac('sha1', secret).update(stringToSign).digest('base64');
  }

  async recognize(audioBase64: string): Promise<ACRCloudResult> {
    const host      = this.config.get<string>('ACRCLOUD_HOST');
    const key       = this.config.get<string>('ACRCLOUD_ACCESS_KEY');
    if (!host || !key) throw new Error('ACRCloud não configurado (ACRCLOUD_HOST / ACRCLOUD_ACCESS_KEY em falta)');

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.buildSignature('POST', '/v1/identify', timestamp);

    const formData = new FormData();
    const audioBlob = new Blob([Buffer.from(audioBase64, 'base64')], { type: 'audio/mpeg' });
    formData.append('sample', audioBlob, 'sample.mp3');
    formData.append('access_key',        key);
    formData.append('data_type',         'audio');
    formData.append('signature_version', '1');
    formData.append('signature',         signature);
    formData.append('timestamp',         String(timestamp));

    const res  = await fetch(`https://${host}/v1/identify`, { method: 'POST', body: formData });
    const data = await res.json() as any;

    if (data.status?.code !== 0) {
      throw new Error(`ACRCloud erro: ${data.status?.msg}`);
    }

    const music = data.metadata?.music?.[0];
    return {
      title:      music?.title,
      artist:     music?.artists?.[0]?.name,
      album:      music?.album?.name,
      isrc:       music?.external_ids?.isrc,
      confidence: music?.score != null ? music.score / 100 : undefined,
    };
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('ACRCLOUD_HOST') &&
      this.config.get('ACRCLOUD_ACCESS_KEY') &&
      this.config.get('ACRCLOUD_ACCESS_SECRET')
    );
  }
}
