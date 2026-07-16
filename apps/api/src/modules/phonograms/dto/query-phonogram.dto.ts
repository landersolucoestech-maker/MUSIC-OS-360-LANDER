import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryPhonogramDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artista_id?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado. Use "artista_id".' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  obra_id?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado. Use "obra_id".' })
  @IsOptional()
  @IsUUID()
  workId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isrc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genero_musical?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genre?: string;
}
