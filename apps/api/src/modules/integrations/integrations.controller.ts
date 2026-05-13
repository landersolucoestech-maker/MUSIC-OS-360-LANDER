import {
  Controller, Post, Get, Body, Param, Delete,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ACRCloudService }   from './acrcloud/acrcloud.service';
import { AutentiqueService } from './autentique/autentique.service';
import { SpotifyService }    from './spotify/spotify.service';
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
  ) {}

  // ─── Status geral ──────────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Status de todas as integrações' })
  getStatus() {
    return {
      acrcloud:   { configured: this.acrCloud.isConfigured() },
      autentique: { configured: true },
      spotify:    { configured: this.spotify.isConfigured() },
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
    const url = this.spotify.getAuthUrl(req.tenantId, req.userId);
    return { url };
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
}
