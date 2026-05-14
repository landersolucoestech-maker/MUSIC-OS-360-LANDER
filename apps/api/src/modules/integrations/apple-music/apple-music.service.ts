import { Injectable, Inject } from '@nestjs/common';
import * as crypto              from 'crypto';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }    from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

const APPLE_API = 'https://api.music.apple.com/v1';
const PROVIDER  = 'apple_music';

interface AppleCreds {
  team_id:     string;
  key_id:      string;
  private_key: string;
}

@Injectable()
export class AppleMusicService extends IntegrationBaseService {
  constructor(
    @Inject(DRIZZLE_DB) db: DrizzleDB,
    enc: EncryptionService,
  ) {
    super(db, enc);
  }

  async configure(tenantId: string, teamId: string, keyId: string, privateKey: string): Promise<void> {
    await this.saveCredentials(tenantId, PROVIDER, {
      team_id:     teamId,
      key_id:      keyId,
      private_key: privateKey,
    });
  }

  async getProviderStatus(tenantId: string) {
    return this.getStatus(tenantId, PROVIDER);
  }

  async disconnectProvider(tenantId: string): Promise<void> {
    await this.disconnect(tenantId, PROVIDER);
  }

  private buildDeveloperToken(creds: AppleCreds): string {
    const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: creds.key_id })).toString('base64url');
    const now     = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      iss: creds.team_id,
      iat: now,
      exp: now + 15_777_000, // ~6 meses
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;
    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    const signature = sign.sign({ key: creds.private_key, dsaEncoding: 'ieee-p1363' }, 'base64url');
    return `${signingInput}.${signature}`;
  }

  private async getToken(tenantId: string): Promise<string | null> {
    const creds = await this.loadCredentials<AppleCreds>(tenantId, PROVIDER);
    if (!creds) return null;
    try {
      return this.buildDeveloperToken(creds);
    } catch {
      return null;
    }
  }

  async getArtistFromCatalog(tenantId: string, artistId: string, storefront = 'br') {
    const token = await this.getToken(tenantId);
    if (!token) return { error: 'Apple Music não configurado' };
    const res = await fetch(`${APPLE_API}/catalog/${storefront}/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { error: `Apple Music API error: ${res.status}` };
    const d = await res.json() as any;
    const attr = d.data?.[0]?.attributes ?? {};
    return {
      artistId,
      name:        attr.name ?? '',
      genreNames:  attr.genreNames ?? [],
      url:         attr.url ?? '',
      editorialNotes: attr.editorialNotes?.short ?? '',
      artwork:     attr.artwork?.url?.replace('{w}x{h}', '400x400') ?? '',
      syncedAt:    new Date().toISOString(),
    };
  }

  async searchCatalog(tenantId: string, term: string, types = 'artists,albums', storefront = 'br', limit = 10) {
    const token = await this.getToken(tenantId);
    if (!token) return { error: 'Apple Music não configurado' };
    const res = await fetch(
      `${APPLE_API}/catalog/${storefront}/search?term=${encodeURIComponent(term)}&types=${types}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return { error: `Apple Music API error: ${res.status}` };
    return res.json();
  }
}
