import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateArtistDto } from './create-artist.dto';

export class UpdateArtistDto extends PartialType(CreateArtistDto) {
  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}
