import {
  Controller, Post, Get, Delete, Body, Param, Query,
  HttpCode, HttpStatus, Request, BadRequestException, InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService }              from '@nestjs/config';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { randomUUID }    from 'crypto';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Public }        from '../../core/decorators/public.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { CacheService }  from '../../core/cache/cache.service';
import { ACRCloudService }    from './acrcloud/acrcloud.service';
import { AutentiqueService }  from './autentique/autentique.service';
import { SpotifyService }     from './spotify/spotify.service';
import { YouTubeService }     from './youtube/youtube.service';
import { DeezerService }      from './deezer/deezer.service';
import { SoundCloudService }  from './soundcloud/soundcloud.service';
import { AppleMusicService }  from './apple-music/apple-music.service';
import { InstagramService }   from './instagram/instagram.service';
import { TikTokService }      from './tiktok/tiktok.service';
import { GoogleAdsService }   from './google-ads/google-ads.service';
import { AbramusService }     from './abramus/abramus.service';
import {
  ConfigureAutentiqueDto,
  SendForSignatureDto,
  RecognizeAudioDto,
  SpotifyConnectDto,
  SyncSpotifyArtistDto,
  OAuthInitDto,
  OAuthExchangeDto,
} from './dto/integrations.dto';

@ApiTags('Integrations')
@ApiBearerAuth()
@RequireRole('editor')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly acrCloud:    ACRCloudService,
    private readonly autentique:  AutentiqueService,
    private readonly spotify:     SpotifyService,
    private readonly youtube:     YouTubeService,
    private readonly deezer:      DeezerService,
    private readonly soundcloud:  SoundCloudService,
    private readonly appleMusic:  AppleMusicService,
    private readonly instagram:   InstagramService,
    private readonly tiktok:      TikTokService,
    private readonly googleAds:   GoogleAdsService,
    private readonly abramus:     AbramusService,
    private readonly config:      ConfigService,
    private readonly cache:       CacheService,
  ) {}

  // ─── OAuth init (authenticated) ────────────────────────────────────────────

  /**
   * Step 1 of the marketing OAuth flow.
   * Must be called by an authenticated user before the popup is opened.
   * Issues a short-lived, single-use `exchange_token` that is stored server-side
   * in the in-memory cache.  The token is later presented to POST /oauth/exchange,
   * binding the code exchange to this authenticated session.  This prevents the
   * exchange endpoint from being used as an open token-exchange broker.
   */
  @Post('oauth/init')
  @RequireRole('editor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emite exchange_token de uso único para iniciar fluxo OAuth de marketing' })
  oauthInit(@Body() dto: OAuthInitDto): { exchange_token: string } {
    const token = randomUUID();
    // TTL: 10 min — enough for the popup OAuth flow to complete.
    this.cache.set(`oauth_exchange:${token}`, { platform: dto.platform }, 10 * 60 * 1000);
    return { exchange_token: token };
  }

  // ─── OAuth exchange (public, requires server-issued exchange_token) ─────────

  /**
   * Step 2 of the marketing OAuth flow (called from popup callback page).
   *
   * Although this endpoint is `@Public()` (no Bearer auth — the popup window has
   * no access to the user's session), it is protected by the server-issued
   * `exchange_token` from POST /oauth/init.  That token:
   *   1. Can only be issued by an authenticated user (step 1).
   *   2. Is single-use — consumed immediately on first valid request.
   *   3. Expires after 10 minutes.
   *
   * The redirect_uri is constructed from APP_URL config — it is never accepted
   * from the client, preventing open-redirect / token-hijacking attacks.
   */
  @Post('oauth/exchange')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Troca código de autorização OAuth por access_token' })
  async oauthExchange(@Body() dto: OAuthExchangeDto): Promise<{ access_token: string; platform: string }> {
    const { code, platform, exchange_token } = dto;

    // Validate and consume the server-issued exchange token.
    const cacheKey = `oauth_exchange:${exchange_token}`;
    const entry = this.cache.get<{ platform: string }>(cacheKey);
    if (!entry) {
      throw new BadRequestException('exchange_token inválido ou expirado. Inicie a autorização novamente.');
    }
    if (entry.platform !== platform) {
      throw new BadRequestException('exchange_token não corresponde à plataforma solicitada.');
    }
    // Single-use: delete immediately after validation.
    this.cache.delete(cacheKey);

    // Construct redirect_uri from server config — never trust the client value.
    const appUrl      = this.config.get<string>('APP_URL') ?? 'http://localhost:5000';
    const redirect_uri = `${appUrl}/oauth/callback`;

    const isInstagram = platform === 'corp_instagram' || platform === 'meta_business';
    const isTikTok    = platform === 'corp_tiktok'    || platform === 'tiktok_business';
    const isYouTube   = platform === 'corp_youtube'   || platform === 'youtube_business' || platform === 'google_business';

    try {
      if (isInstagram) {
        const appId     = this.config.get<string>('META_APP_ID')     ?? '';
        const appSecret = this.config.get<string>('META_APP_SECRET') ?? '';
        if (!appId || !appSecret) throw new BadRequestException('META_APP_ID / META_APP_SECRET não configurados');

        const url = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${appSecret}&code=${code}`;
        const res  = await fetch(url);
        const json = await res.json() as Record<string, unknown>;
        if (json['error']) {
          const errObj = json['error'] as Record<string, unknown>;
          throw new BadRequestException((errObj['message'] as string | undefined) ?? 'Meta OAuth error');
        }
        return { access_token: json['access_token'] as string, platform };
      }

      if (isTikTok) {
        const clientKey    = this.config.get<string>('TIKTOK_CLIENT_KEY')    ?? '';
        const clientSecret = this.config.get<string>('TIKTOK_CLIENT_SECRET') ?? '';
        if (!clientKey || !clientSecret) throw new BadRequestException('TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET não configurados');

        const res  = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri }),
        });
        const json = await res.json() as Record<string, unknown>;
        if (json['error']) throw new BadRequestException((json['error_description'] as string | undefined) ?? (json['error'] as string));
        return { access_token: json['access_token'] as string, platform };
      }

      if (isYouTube) {
        const clientId     = this.config.get<string>('GOOGLE_CLIENT_ID')     ?? '';
        const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
        if (!clientId || !clientSecret) throw new BadRequestException('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não configurados');

        const res  = await fetch('https://oauth2.googleapis.com/token', {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri, grant_type: 'authorization_code' }),
        });
        const json = await res.json() as Record<string, unknown>;
        if (json['error']) throw new BadRequestException((json['error_description'] as string | undefined) ?? (json['error'] as string));
        return { access_token: json['access_token'] as string, platform };
      }

      throw new BadRequestException(`Plataforma não suportada para troca OAuth: ${platform}`);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(`Falha na troca OAuth: ${(err as Error).message}`);
    }
  }

  // ─── Status geral ──────────────────────────────────────────────────────────

  @Get('status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status de todas as integrações' })
  getStatus() {
    return {
      acrcloud:    { configured: this.acrCloud.isConfigured() },
      autentique:  { configured: true },
      spotify:     { configured: this.spotify.isConfigured() },
      youtube:     { configured: this.youtube.isConfigured() },
      deezer:      { configured: this.deezer.isConfigured() },
      soundcloud:  { configured: this.soundcloud.isConfigured() },
      apple_music: { configured: this.appleMusic.isConfigured() },
      instagram:   { configured: this.instagram.isConfigured() },
      tiktok:      { configured: this.tiktok.isConfigured() },
      google_ads:  { configured: this.googleAds.isConfigured() },
      abramus:     { configured: true },
    };
  }

  // ─── ACRCloud ──────────────────────────────────────────────────────────────

  @Post('acrcloud/recognize')
  @RequireRole('editor')
  @Audit('integration.acr_recognized')
  @ApiOperation({ summary: 'Identificar música por áudio (ACRCloud)' })
  @HttpCode(HttpStatus.OK)
  recognizeAudio(@Body() dto: RecognizeAudioDto) {
    return this.acrCloud.recognize(dto.audioBase64);
  }

  // ─── Autentique ────────────────────────────────────────────────────────────

  @Post('autentique/configure')
  @RequireRole('admin')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Configurar token de API Autentique (admin+)' })
  @HttpCode(HttpStatus.OK)
  configureAutentique(@Request() req: any, @Body() dto: ConfigureAutentiqueDto) {
    return this.autentique.configure(req.tenant?.id ?? req.tenantId, dto.apiToken);
  }

  @Post('autentique/send')
  @RequireRole('editor')
  @Audit('integration.document_sent')
  @ApiOperation({ summary: 'Enviar contrato para assinatura via Autentique' })
  sendForSignature(@Request() req: any, @Body() dto: SendForSignatureDto) {
    return this.autentique.sendForSignature({
      tenantId:   req.tenant?.id ?? req.tenantId,
      contractId: dto.contractId,
      name:       dto.name,
      fileBase64: dto.fileBase64,
      signers:    dto.signers,
    });
  }

  @Post('autentique/webhook')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Webhook Autentique (assinatura concluída)' })
  @HttpCode(HttpStatus.OK)
  autentiqueWebhook(@Body() payload: any) {
    return this.autentique.handleWebhook(payload);
  }

  // ─── Spotify ───────────────────────────────────────────────────────────────

  @Get('spotify/auth')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth Spotify' })
  spotifyAuthUrl(@Request() req: any) {
    return { url: this.spotify.getAuthUrl(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId) };
  }

  @Post('spotify/callback')
  @RequireRole('editor')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Callback OAuth Spotify' })
  @HttpCode(HttpStatus.OK)
  spotifyCallback(@Body() dto: SpotifyConnectDto) {
    return this.spotify.handleCallback(dto.code, dto.state);
  }

  @Post('spotify/sync-artist')
  @RequireRole('editor')
  @Audit('integration.spotify_synced')
  @ApiOperation({ summary: 'Sincronizar métricas de artista no Spotify' })
  @HttpCode(HttpStatus.OK)
  syncSpotifyArtist(@Request() req: any, @Body() dto: SyncSpotifyArtistDto) {
    return this.spotify.syncArtistMetrics(req.tenant?.id ?? req.tenantId, dto.spotifyArtistId);
  }

  @Delete('spotify/disconnect')
  @RequireRole('admin')
  @Audit('integration.disconnected')
  @ApiOperation({ summary: 'Desconectar conta Spotify (admin+)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  spotifyDisconnect(@Request() req: any) {
    return this.spotify.disconnect(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId);
  }

  // ─── YouTube ───────────────────────────────────────────────────────────────

  @Get('youtube/status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status integração YouTube' })
  youtubeStatus() {
    return { configured: this.youtube.isConfigured() };
  }

  @Get('youtube/channel/:id')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Estatísticas de canal YouTube' })
  getYouTubeChannel(@Param('id') id: string) {
    return this.youtube.getChannelStats(id);
  }

  @Get('youtube/video/:id')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Estatísticas de vídeo YouTube' })
  getYouTubeVideo(@Param('id') id: string) {
    return this.youtube.getVideoStats(id);
  }

  @Get('youtube/search')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Buscar vídeos no YouTube' })
  searchYouTube(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.youtube.searchVideos(q, limit ? +limit : 10);
  }

  // ─── Deezer ────────────────────────────────────────────────────────────────

  @Get('deezer/artist/:id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Estatísticas de artista no Deezer' })
  getDeezerArtist(@Param('id') id: string) {
    return this.deezer.getArtistStats(id);
  }

  @Get('deezer/artist/:id/top')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Top tracks do artista no Deezer' })
  getDeezerTopTracks(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.deezer.getTopTracks(id, limit ? +limit : 10);
  }

  @Get('deezer/album/:id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Dados de álbum no Deezer' })
  getDeezerAlbum(@Param('id') id: string) {
    return this.deezer.getAlbum(id);
  }

  @Get('deezer/search')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Buscar artistas no Deezer' })
  searchDeezer(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.deezer.searchArtist(q, limit ? +limit : 5);
  }

  // ─── SoundCloud ────────────────────────────────────────────────────────────

  @Post('soundcloud/configure')
  @RequireRole('admin')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Configurar credenciais SoundCloud (admin+)' })
  @HttpCode(HttpStatus.OK)
  configureSoundCloud(
    @Request() req: any,
    @Body() body: { clientId: string; clientSecret: string },
  ) {
    return this.soundcloud.configure(req.tenant?.id ?? req.tenantId, body.clientId, body.clientSecret);
  }

  @Get('soundcloud/status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status integração SoundCloud' })
  soundCloudStatus(@Request() req: any) {
    return this.soundcloud.getProviderStatus(req.tenant?.id ?? req.tenantId);
  }

  @Delete('soundcloud/disconnect')
  @RequireRole('admin')
  @Audit('integration.disconnected')
  @ApiOperation({ summary: 'Desconectar SoundCloud (admin+)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  soundCloudDisconnect(@Request() req: any) {
    return this.soundcloud.disconnectProvider(req.tenant?.id ?? req.tenantId);
  }

  @Get('soundcloud/user')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Resolver perfil de usuário SoundCloud por URL' })
  resolveSoundCloudUser(@Query('url') url: string) {
    return this.soundcloud.resolveUser(url);
  }

  @Get('soundcloud/track/:id')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Estatísticas de track SoundCloud' })
  getSoundCloudTrack(@Param('id') id: string) {
    return this.soundcloud.getTrackStats(id);
  }

  @Get('soundcloud/search')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Buscar tracks no SoundCloud' })
  searchSoundCloud(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.soundcloud.searchTracks(q, limit ? +limit : 10);
  }

  // ─── Apple Music ───────────────────────────────────────────────────────────

  @Post('apple-music/configure')
  @RequireRole('admin')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Configurar Apple Music Developer Token (admin+)' })
  @HttpCode(HttpStatus.OK)
  configureAppleMusic(
    @Request() req: any,
    @Body() body: { teamId: string; keyId: string; privateKey: string },
  ) {
    return this.appleMusic.configure(req.tenant?.id ?? req.tenantId, body.teamId, body.keyId, body.privateKey);
  }

  @Get('apple-music/status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status integração Apple Music' })
  appleMusicStatus(@Request() req: any) {
    return this.appleMusic.getProviderStatus(req.tenant?.id ?? req.tenantId);
  }

  @Delete('apple-music/disconnect')
  @RequireRole('admin')
  @Audit('integration.disconnected')
  @ApiOperation({ summary: 'Desconectar Apple Music (admin+)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  appleMusicDisconnect(@Request() req: any) {
    return this.appleMusic.disconnectProvider(req.tenant?.id ?? req.tenantId);
  }

  @Get('apple-music/artist/:id')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Buscar artista no catálogo Apple Music' })
  getAppleMusicArtist(
    @Request() req: any,
    @Param('id') id: string,
    @Query('storefront') storefront?: string,
  ) {
    return this.appleMusic.getArtistFromCatalog(req.tenant?.id ?? req.tenantId, id, storefront ?? 'br');
  }

  @Get('apple-music/search')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Pesquisar no catálogo Apple Music' })
  searchAppleMusic(
    @Request() req: any,
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('storefront') storefront?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appleMusic.searchCatalog(
      req.tenant?.id ?? req.tenantId, q, types ?? 'artists,albums', storefront ?? 'br', limit ? +limit : 10,
    );
  }

  // ─── Instagram ─────────────────────────────────────────────────────────────

  @Get('instagram/auth')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth Instagram (Meta)' })
  instagramAuthUrl(@Request() req: any) {
    return { url: this.instagram.getAuthUrl(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId) };
  }

  @Post('instagram/callback')
  @RequireRole('editor')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Callback OAuth Instagram' })
  @HttpCode(HttpStatus.OK)
  instagramCallback(@Body() body: { code: string; state: string }) {
    return this.instagram.handleCallback(body.code, body.state);
  }

  @Get('instagram/status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status integração Instagram' })
  instagramStatus(@Request() req: any) {
    return this.instagram.getProviderStatus(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId);
  }

  @Get('instagram/metrics')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Métricas da conta Instagram Business' })
  instagramMetrics(@Request() req: any) {
    return this.instagram.getAccountMetrics(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId);
  }

  @Delete('instagram/disconnect')
  @RequireRole('admin')
  @Audit('integration.disconnected')
  @ApiOperation({ summary: 'Desconectar Instagram (admin+)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  instagramDisconnect(@Request() req: any) {
    return this.instagram.disconnectProvider(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId);
  }

  // ─── TikTok Ads ────────────────────────────────────────────────────────────

  @Post('tiktok/ads/configure')
  @RequireRole('admin')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Configurar TikTok Ads (admin+)' })
  @HttpCode(HttpStatus.OK)
  configureTikTokAds(
    @Request() req: any,
    @Body() body: { appId: string; secret: string; advertiserId: string; accessToken: string },
  ) {
    return this.tiktok.configureAds(
      req.tenant?.id ?? req.tenantId, body.appId, body.secret, body.advertiserId, body.accessToken,
    );
  }

  @Get('tiktok/ads/status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status integração TikTok Ads' })
  tiktokAdsStatus(@Request() req: any) {
    return this.tiktok.getAdsStatus(req.tenant?.id ?? req.tenantId);
  }

  @Delete('tiktok/ads/disconnect')
  @RequireRole('admin')
  @Audit('integration.disconnected')
  @ApiOperation({ summary: 'Desconectar TikTok Ads (admin+)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  tiktokAdsDisconnect(@Request() req: any) {
    return this.tiktok.disconnectAds(req.tenant?.id ?? req.tenantId);
  }

  @Get('tiktok/ads/campaigns')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Listar campanhas TikTok Ads' })
  tiktokAdsCampaigns(@Request() req: any) {
    return this.tiktok.getAdsCampaigns(req.tenant?.id ?? req.tenantId);
  }

  @Get('tiktok/ads/insights')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Insights de campanhas TikTok Ads' })
  tiktokAdsInsights(
    @Request() req: any,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.tiktok.getAdsInsights(req.tenant?.id ?? req.tenantId, startDate, endDate);
  }

  // ─── TikTok orgânico ───────────────────────────────────────────────────────

  @Get('tiktok/auth')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth TikTok orgânico' })
  tiktokAuthUrl(@Request() req: any) {
    return { url: this.tiktok.getOAuthUrl(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId) };
  }

  @Post('tiktok/callback')
  @RequireRole('editor')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Callback OAuth TikTok orgânico' })
  @HttpCode(HttpStatus.OK)
  tiktokCallback(@Body() body: { code: string; state: string }) {
    return this.tiktok.handleOAuthCallback(body.code, body.state);
  }

  // ─── Google Ads ────────────────────────────────────────────────────────────

  @Post('google-ads/configure')
  @RequireRole('admin')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Configurar Google Ads (admin+)' })
  @HttpCode(HttpStatus.OK)
  configureGoogleAds(
    @Request() req: any,
    @Body() body: { developerToken: string; customerId: string },
  ) {
    return this.googleAds.configure(req.tenant?.id ?? req.tenantId, body.developerToken, body.customerId);
  }

  @Get('google-ads/auth')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth Google Ads' })
  googleAdsAuthUrl(@Request() req: any) {
    return { url: this.googleAds.getOAuthUrl(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId) };
  }

  @Post('google-ads/callback')
  @RequireRole('editor')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Callback OAuth Google Ads' })
  @HttpCode(HttpStatus.OK)
  googleAdsCallback(@Body() body: { code: string; state: string }) {
    return this.googleAds.handleOAuthCallback(body.code, body.state);
  }

  @Get('google-ads/status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status integração Google Ads' })
  googleAdsStatus(@Request() req: any) {
    return this.googleAds.getProviderStatus(req.tenant?.id ?? req.tenantId);
  }

  @Delete('google-ads/disconnect')
  @RequireRole('admin')
  @Audit('integration.disconnected')
  @ApiOperation({ summary: 'Desconectar Google Ads (admin+)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  googleAdsDisconnect(@Request() req: any) {
    return this.googleAds.disconnectProvider(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId);
  }

  @Get('google-ads/campaigns')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Listar campanhas Google Ads' })
  googleAdsCampaigns(@Request() req: any) {
    return this.googleAds.getCampaigns(req.tenant?.id ?? req.tenantId, req.auth?.userId ?? req.userId);
  }

  // ─── Abramus ───────────────────────────────────────────────────────────────

  @Post('abramus/configure')
  @RequireRole('admin')
  @Audit('integration.connected')
  @ApiOperation({ summary: 'Configurar credenciais Abramus (admin+)' })
  @HttpCode(HttpStatus.OK)
  configureAbramus(
    @Request() req: any,
    @Body() body: { username: string; password: string; baseUrl: string },
  ) {
    return this.abramus.configure(req.tenant?.id ?? req.tenantId, body.username, body.password, body.baseUrl);
  }

  @Get('abramus/status')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Status integração Abramus' })
  abramusStatus(@Request() req: any) {
    return this.abramus.getProviderStatus(req.tenant?.id ?? req.tenantId);
  }

  @Delete('abramus/disconnect')
  @RequireRole('admin')
  @Audit('integration.disconnected')
  @ApiOperation({ summary: 'Desconectar Abramus (admin+)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  abramusDisconnect(@Request() req: any) {
    return this.abramus.disconnectProvider(req.tenant?.id ?? req.tenantId);
  }

  @Get('abramus/search-artist')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Buscar artista no Abramus' })
  abramusSearchArtist(
    @Request() req: any,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.abramus.searchArtist(req.tenant?.id ?? req.tenantId, q, limit ? +limit : 10);
  }

  @Get('abramus/search-work')
  @RequireRole('editor')
  @ApiOperation({ summary: 'Buscar obra no Abramus' })
  abramusSearchWork(
    @Request() req: any,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.abramus.searchWork(req.tenant?.id ?? req.tenantId, q, limit ? +limit : 10);
  }

  @Post('abramus/register-work')
  @RequireRole('manager')
  @Audit('integration.abramus_work_registered')
  @ApiOperation({ summary: 'Registrar obra no Abramus (manager+)' })
  abramusRegisterWork(@Request() req: any, @Body() body: any) {
    return this.abramus.registerWork(req.tenant?.id ?? req.tenantId, body);
  }

  @Get('abramus/statements')
  @RequireRole('manager')
  @ApiOperation({ summary: 'Extratos de direitos autorais no Abramus (manager+)' })
  abramusStatements(
    @Request() req: any,
    @Query('periodo') periodo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.abramus.getStatements(req.tenant?.id ?? req.tenantId, periodo, limit ? +limit : 20);
  }
}
