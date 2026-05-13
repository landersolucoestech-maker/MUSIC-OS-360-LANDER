import { IsString, IsOptional, IsNotEmpty, IsBase64 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }            from '@nestjs/swagger';

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
