import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryArtistDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'MPB' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ enum: ['exclusivo', 'parceiro', 'independente'] })
  @IsOptional()
  @IsIn(['exclusivo', 'parceiro', 'independente'])
  vinculo?: 'exclusivo' | 'parceiro' | 'independente';
}
