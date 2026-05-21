import { IsString, IsOptional, IsNotEmpty, IsBase64, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                  from '@nestjs/swagger';

export class OAuthInitDto {
  @ApiProperty({ description: 'Plataforma que iniciará o fluxo OAuth' })
  @IsString() @IsNotEmpty()
  @IsIn(['corp_instagram', 'meta_business', 'corp_tiktok', 'tiktok_business', 'corp_youtube', 'youtube_business', 'google_business'])
  platform!: string;
}

export class OAuthExchangeDto {
  @ApiProperty({ description: 'Código de autorização retornado pela plataforma' })
  @IsString() @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'Identificador da plataforma (ex: corp_instagram, corp_tiktok, corp_youtube)' })
  @IsString() @IsNotEmpty()
  @IsIn(['corp_instagram', 'meta_business', 'corp_tiktok', 'tiktok_business', 'corp_youtube', 'youtube_business', 'google_business'])
  platform!: string;

  @ApiProperty({ description: 'Token de troca de uso único emitido por POST /oauth/init (substitui redirect_uri)' })
  @IsString() @IsNotEmpty()
  exchange_token!: string;
}

export class ConfigureAutentiqueDto {
  @ApiProperty({ description: 'Token de API da Autentique' })
  @IsString() @IsNotEmpty()
  apiToken!: string;
}

export class SendForSignatureDto {
  @ApiProperty({ description: 'ID do contrato na plataforma' })
  @IsString() @IsNotEmpty()
  contractId!: string;

  @ApiProperty({ description: 'Nome do documento' })
  @IsString() @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Conteúdo do ficheiro em base64' })
  @IsString() @IsBase64()
  fileBase64!: string;

  @ApiProperty({ description: 'Lista de signatários', type: 'array' })
  signers!: Array<{ name: string; email: string }>;
}

export class RecognizeAudioDto {
  @ApiProperty({ description: 'Áudio em base64 (mp3, wav)' })
  @IsString() @IsBase64()
  audioBase64!: string;
}

export class SpotifyConnectDto {
  @ApiProperty({ description: 'Código OAuth devolvido pelo Spotify' })
  @IsString() @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'State passado no fluxo OAuth' })
  @IsString() @IsNotEmpty()
  state!: string;
}

export class SyncSpotifyArtistDto {
  @ApiProperty({ description: 'ID do artista no Spotify' })
  @IsString() @IsNotEmpty()
  spotifyArtistId!: string;
}
