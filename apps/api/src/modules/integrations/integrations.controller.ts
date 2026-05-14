import {
  Controller, Post, Get, Delete, Body, Param, Query,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
} from './dto/integrations.dto';

@ApiTags('Integrations')
@ApiBearerAuth('Clerk JWT')
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
  ) {}

  // ─── Status geral ──────────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Status de todas as integrações' })
  getStatus() {
    return {
      acrcloud:    { configured: this.acrCloud.isConfigured() },
      autentique:  { configured: true },
      spotify:     { configured: this.spotify.isConfigured() },
      youtube:     { configured: this.youtube.isConfigured() },
      deezer:      { configured: this.deezer.isConfigured() },
      soundcloud:  { configured: this.soundcloud.isConfigured() },
      instagram:   { configured: this.instagram.isConfigured() },
      tiktok:      { configured: this.tiktok.isConfigured() },
      google_ads:  { configured: this.googleAds.isConfigured() },
    };
  }

  // ─── ACRCloud ──────────────────────────────────────────────────────────────

  @Post('acrcloud/recognize')
  @ApiOperation({ summary: 'Identificar música por áudio (ACRCloud)' })
  @HttpCode(HttpStatus.OK)
  recognizeAudio(@Body() dto: RecognizeAudioDto) {
    return this.acrCloud.recognize(dto.audioBase64);
  }

  // ─── Autentique ────────────────────────────────────────────────────────────

  @Post('autentique/configure')
  @ApiOperation({ summary: 'Configurar token de API Autentique' })
  @HttpCode(HttpStatus.OK)
  configureAutentique(@Request() req: any, @Body() dto: ConfigureAutentiqueDto) {
    return this.autentique.configure(req.tenantId, dto.apiToken);
  }

  @Post('autentique/send')
  @ApiOperation({ summary: 'Enviar contrato para assinatura via Autentique' })
  sendForSignature(@Request() req: any, @Body() dto: SendForSignatureDto) {
    return this.autentique.sendForSignature({
      tenantId:   req.tenantId,
      contractId: dto.contractId,
      name:       dto.name,
      fileBase64: dto.fileBase64,
      signers:    dto.signers,
    });
  }

  @Post('autentique/webhook')
  @ApiOperation({ summary: 'Webhook Autentique (assinatura concluída)' })
  @HttpCode(HttpStatus.OK)
  autentiqueWebhook(@Body() payload: any) {
    return this.autentique.handleWebhook(payload);
  }

  // ─── Spotify ───────────────────────────────────────────────────────────────

  @Get('spotify/auth')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth Spotify' })
  spotifyAuthUrl(@Request() req: any) {
    return { url: this.spotify.getAuthUrl(req.tenantId, req.userId) };
  }

  @Post('spotify/callback')
  @ApiOperation({ summary: 'Callback OAuth Spotify' })
  @HttpCode(HttpStatus.OK)
  spotifyCallback(@Body() dto: SpotifyConnectDto) {
    return this.spotify.handleCallback(dto.code, dto.state);
  }

  @Post('spotify/sync-artist')
  @ApiOperation({ summary: 'Sincronizar métricas de artista no Spotify' })
  @HttpCode(HttpStatus.OK)
  syncSpotifyArtist(@Request() req: any, @Body() dto: SyncSpotifyArtistDto) {
    return this.spotify.syncArtistMetrics(req.tenantId, dto.spotifyArtistId);
  }

  @Delete('spotify/disconnect')
  @ApiOperation({ summary: 'Desconectar conta Spotify' })
  @HttpCode(HttpStatus.NO_CONTENT)
  spotifyDisconnect(@Request() req: any) {
    return this.spotify.disconnect(req.tenantId, req.userId);
  }

  // ─── YouTube ───────────────────────────────────────────────────────────────

  @Get('youtube/status')
  @ApiOperation({ summary: 'Status integração YouTube' })
  youtubeStatus() {
    return { configured: this.youtube.isConfigured() };
  }

  @Get('youtube/channel/:id')
  @ApiOperation({ summary: 'Estatísticas de canal YouTube' })
  getYouTubeChannel(@Param('id') id: string) {
    return this.youtube.getChannelStats(id);
  }

  @Get('youtube/video/:id')
  @ApiOperation({ summary: 'Estatísticas de vídeo YouTube' })
  getYouTubeVideo(@Param('id') id: string) {
    return this.youtube.getVideoStats(id);
  }

  @Get('youtube/search')
  @ApiOperation({ summary: 'Buscar vídeos no YouTube' })
  searchYouTube(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.youtube.searchVideos(q, limit ? +limit : 10);
  }

  // ─── Deezer ────────────────────────────────────────────────────────────────

  @Get('deezer/artist/:id')
  @ApiOperation({ summary: 'Estatísticas de artista no Deezer' })
  getDeezerArtist(@Param('id') id: string) {
    return this.deezer.getArtistStats(id);
  }

  @Get('deezer/artist/:id/top')
  @ApiOperation({ summary: 'Top tracks do artista no Deezer' })
  getDeezerTopTracks(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.deezer.getTopTracks(id, limit ? +limit : 10);
  }

  @Get('deezer/album/:id')
  @ApiOperation({ summary: 'Dados de álbum no Deezer' })
  getDeezerAlbum(@Param('id') id: string) {
    return this.deezer.getAlbum(id);
  }

  @Get('deezer/search')
  @ApiOperation({ summary: 'Buscar artistas no Deezer' })
  searchDeezer(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.deezer.searchArtist(q, limit ? +limit : 5);
  }

  // ─── SoundCloud ────────────────────────────────────────────────────────────

  @Post('soundcloud/configure')
  @ApiOperation({ summary: 'Configurar credenciais SoundCloud' })
  @HttpCode(HttpStatus.OK)
  configureSoundCloud(
    @Request() req: any,
    @Body() body: { clientId: string; clientSecret: string },
  ) {
    return this.soundcloud.configure(req.tenantId, body.clientId, body.clientSecret);
  }

  @Get('soundcloud/status')
  @ApiOperation({ summary: 'Status integração SoundCloud' })
  soundCloudStatus(@Request() req: any) {
    return this.soundcloud.getProviderStatus(req.tenantId);
  }

  @Delete('soundcloud/disconnect')
  @ApiOperation({ summary: 'Desconectar SoundCloud' })
  @HttpCode(HttpStatus.NO_CONTENT)
  soundCloudDisconnect(@Request() req: any) {
    return this.soundcloud.disconnectProvider(req.tenantId);
  }

  @Get('soundcloud/user')
  @ApiOperation({ summary: 'Resolver perfil de usuário SoundCloud por URL' })
  resolveSoundCloudUser(@Query('url') url: string) {
    return this.soundcloud.resolveUser(url);
  }

  @Get('soundcloud/track/:id')
  @ApiOperation({ summary: 'Estatísticas de track SoundCloud' })
  getSoundCloudTrack(@Param('id') id: string) {
    return this.soundcloud.getTrackStats(id);
  }

  @Get('soundcloud/search')
  @ApiOperation({ summary: 'Buscar tracks no SoundCloud' })
  searchSoundCloud(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.soundcloud.searchTracks(q, limit ? +limit : 10);
  }

  // ─── Apple Music ───────────────────────────────────────────────────────────

  @Post('apple-music/configure')
  @ApiOperation({ summary: 'Configurar Apple Music Developer Token' })
  @HttpCode(HttpStatus.OK)
  configureAppleMusic(
    @Request() req: any,
    @Body() body: { teamId: string; keyId: string; privateKey: string },
  ) {
    return this.appleMusic.configure(req.tenantId, body.teamId, body.keyId, body.privateKey);
  }

  @Get('apple-music/status')
  @ApiOperation({ summary: 'Status integração Apple Music' })
  appleMusicStatus(@Request() req: any) {
    return this.appleMusic.getProviderStatus(req.tenantId);
  }

  @Delete('apple-music/disconnect')
  @ApiOperation({ summary: 'Desconectar Apple Music' })
  @HttpCode(HttpStatus.NO_CONTENT)
  appleMusicDisconnect(@Request() req: any) {
    return this.appleMusic.disconnectProvider(req.tenantId);
  }

  @Get('apple-music/artist/:id')
  @ApiOperation({ summary: 'Buscar artista no catálogo Apple Music' })
  getAppleMusicArtist(
    @Request() req: any,
    @Param('id') id: string,
    @Query('storefront') storefront?: string,
  ) {
    return this.appleMusic.getArtistFromCatalog(req.tenantId, id, storefront ?? 'br');
  }

  @Get('apple-music/search')
  @ApiOperation({ summary: 'Pesquisar no catálogo Apple Music' })
  searchAppleMusic(
    @Request() req: any,
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('storefront') storefront?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appleMusic.searchCatalog(
      req.tenantId, q, types ?? 'artists,albums', storefront ?? 'br', limit ? +limit : 10,
    );
  }

  // ─── Instagram ─────────────────────────────────────────────────────────────

  @Get('instagram/auth')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth Instagram (Meta)' })
  instagramAuthUrl(@Request() req: any) {
    return { url: this.instagram.getAuthUrl(req.tenantId, req.userId) };
  }

  @Post('instagram/callback')
  @ApiOperation({ summary: 'Callback OAuth Instagram' })
  @HttpCode(HttpStatus.OK)
  instagramCallback(@Body() body: { code: string; state: string }) {
    return this.instagram.handleCallback(body.code, body.state);
  }

  @Get('instagram/status')
  @ApiOperation({ summary: 'Status integração Instagram' })
  instagramStatus(@Request() req: any) {
    return this.instagram.getProviderStatus(req.tenantId);
  }

  @Get('instagram/metrics')
  @ApiOperation({ summary: 'Métricas da conta Instagram Business' })
  instagramMetrics(@Request() req: any) {
    return this.instagram.getAccountMetrics(req.tenantId, req.userId);
  }

  @Delete('instagram/disconnect')
  @ApiOperation({ summary: 'Desconectar Instagram' })
  @HttpCode(HttpStatus.NO_CONTENT)
  instagramDisconnect(@Request() req: any) {
    return this.instagram.disconnectProvider(req.tenantId, req.userId);
  }

  // ─── TikTok Ads ────────────────────────────────────────────────────────────

  @Post('tiktok/ads/configure')
  @ApiOperation({ summary: 'Configurar TikTok Ads (credenciais diretas)' })
  @HttpCode(HttpStatus.OK)
  configureTikTokAds(
    @Request() req: any,
    @Body() body: { appId: string; secret: string; advertiserId: string; accessToken: string },
  ) {
    return this.tiktok.configureAds(
      req.tenantId, body.appId, body.secret, body.advertiserId, body.accessToken,
    );
  }

  @Get('tiktok/ads/status')
  @ApiOperation({ summary: 'Status integração TikTok Ads' })
  tiktokAdsStatus(@Request() req: any) {
    return this.tiktok.getAdsStatus(req.tenantId);
  }

  @Delete('tiktok/ads/disconnect')
  @ApiOperation({ summary: 'Desconectar TikTok Ads' })
  @HttpCode(HttpStatus.NO_CONTENT)
  tiktokAdsDisconnect(@Request() req: any) {
    return this.tiktok.disconnectAds(req.tenantId);
  }

  @Get('tiktok/ads/campaigns')
  @ApiOperation({ summary: 'Listar campanhas TikTok Ads' })
  tiktokAdsCampaigns(@Request() req: any) {
    return this.tiktok.getAdsCampaigns(req.tenantId);
  }

  @Get('tiktok/ads/insights')
  @ApiOperation({ summary: 'Insights de campanhas TikTok Ads' })
  tiktokAdsInsights(
    @Request() req: any,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.tiktok.getAdsInsights(req.tenantId, startDate, endDate);
  }

  // ─── TikTok orgânico ───────────────────────────────────────────────────────

  @Get('tiktok/auth')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth TikTok orgânico' })
  tiktokAuthUrl(@Request() req: any) {
    return { url: this.tiktok.getOAuthUrl(req.tenantId, req.userId) };
  }

  @Post('tiktok/callback')
  @ApiOperation({ summary: 'Callback OAuth TikTok orgânico' })
  @HttpCode(HttpStatus.OK)
  tiktokCallback(@Body() body: { code: string; state: string }) {
    return this.tiktok.handleOAuthCallback(body.code, body.state);
  }

  // ─── Google Ads ────────────────────────────────────────────────────────────

  @Post('google-ads/configure')
  @ApiOperation({ summary: 'Configurar Google Ads (developer token + customer ID)' })
  @HttpCode(HttpStatus.OK)
  configureGoogleAds(
    @Request() req: any,
    @Body() body: { developerToken: string; customerId: string },
  ) {
    return this.googleAds.configure(req.tenantId, body.developerToken, body.customerId);
  }

  @Get('google-ads/auth')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth Google Ads' })
  googleAdsAuthUrl(@Request() req: any) {
    return { url: this.googleAds.getOAuthUrl(req.tenantId, req.userId) };
  }

  @Post('google-ads/callback')
  @ApiOperation({ summary: 'Callback OAuth Google Ads' })
  @HttpCode(HttpStatus.OK)
  googleAdsCallback(@Body() body: { code: string; state: string }) {
    return this.googleAds.handleOAuthCallback(body.code, body.state);
  }

  @Get('google-ads/status')
  @ApiOperation({ summary: 'Status integração Google Ads' })
  googleAdsStatus(@Request() req: any) {
    return this.googleAds.getProviderStatus(req.tenantId);
  }

  @Delete('google-ads/disconnect')
  @ApiOperation({ summary: 'Desconectar Google Ads' })
  @HttpCode(HttpStatus.NO_CONTENT)
  googleAdsDisconnect(@Request() req: any) {
    return this.googleAds.disconnectProvider(req.tenantId, req.userId);
  }

  @Get('google-ads/campaigns')
  @ApiOperation({ summary: 'Listar campanhas Google Ads' })
  googleAdsCampaigns(@Request() req: any) {
    return this.googleAds.getCampaigns(req.tenantId, req.userId);
  }

  // ─── Abramus ───────────────────────────────────────────────────────────────

  @Post('abramus/configure')
  @ApiOperation({ summary: 'Configurar credenciais Abramus' })
  @HttpCode(HttpStatus.OK)
  configureAbramus(
    @Request() req: any,
    @Body() body: { username: string; password: string; baseUrl: string },
  ) {
    return this.abramus.configure(req.tenantId, body.username, body.password, body.baseUrl);
  }

  @Get('abramus/status')
  @ApiOperation({ summary: 'Status integração Abramus' })
  abramusStatus(@Request() req: any) {
    return this.abramus.getProviderStatus(req.tenantId);
  }

  @Delete('abramus/disconnect')
  @ApiOperation({ summary: 'Desconectar Abramus' })
  @HttpCode(HttpStatus.NO_CONTENT)
  abramusDisconnect(@Request() req: any) {
    return this.abramus.disconnectProvider(req.tenantId);
  }

  @Get('abramus/search-artist')
  @ApiOperation({ summary: 'Buscar artista no Abramus' })
  abramusSearchArtist(
    @Request() req: any,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.abramus.searchArtist(req.tenantId, q, limit ? +limit : 10);
  }

  @Get('abramus/search-work')
  @ApiOperation({ summary: 'Buscar obra no Abramus' })
  abramusSearchWork(
    @Request() req: any,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.abramus.searchWork(req.tenantId, q, limit ? +limit : 10);
  }

  @Post('abramus/register-work')
  @ApiOperation({ summary: 'Registrar obra no Abramus' })
  abramusRegisterWork(@Request() req: any, @Body() body: any) {
    return this.abramus.registerWork(req.tenantId, body);
  }

  @Get('abramus/statements')
  @ApiOperation({ summary: 'Extratos de direitos autorais no Abramus' })
  abramusStatements(
    @Request() req: any,
    @Query('periodo') periodo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.abramus.getStatements(req.tenantId, periodo, limit ? +limit : 20);
  }
}
