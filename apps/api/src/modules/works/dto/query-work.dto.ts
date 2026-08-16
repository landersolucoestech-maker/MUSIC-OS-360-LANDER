import { IsOptional, IsString, IsInt, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryWorkDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'MPB' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ example: 'MPB', description: 'Filtro server-side pelo gênero (coluna genero).' })
  @IsOptional()
  @IsString()
  genero?: string;

  @ApiPropertyOptional({ example: 'autoral' })
  @IsOptional()
  @IsString()
  tipo_obra?: string;

  @ApiPropertyOptional({ description: 'ID do projeto, ou "sem-projeto" para obras sem projeto vinculado.' })
  @IsOptional()
  @IsString()
  projeto_id?: string;

  @ApiPropertyOptional({ enum: ['com-ecad', 'sem-ecad'] })
  @IsOptional()
  @IsIn(['com-ecad', 'sem-ecad'])
  ecad?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artista_id?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado. Use "artista_id".' })
  @IsOptional()
  @IsUUID()
  artistId?: string;
}
