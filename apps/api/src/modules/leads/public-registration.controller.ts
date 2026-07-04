import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';
import { LeadsService } from './leads.service';
import { PublicArtistRegistrationDto } from './dto/leads.dto';

@ApiTags('Public') @Controller('public')
export class PublicRegistrationController {
  constructor(private readonly svc: LeadsService) {}

  @Public()
  @Get('workspaces/:slug')
  @ApiOperation({ summary: 'Resolver workspace ativo para cadastro publico' })
  resolveWorkspace(@Param('slug') slug: string) {
    return this.svc.resolvePublicWorkspace(slug);
  }

  @Public()
  @Post('artist-registration')
  @ApiOperation({ summary: 'Registrar cadastro publico de artista como lead' })
  submitArtistRegistration(@Body() dto: PublicArtistRegistrationDto) {
    return this.svc.submitPublicArtistRegistration(dto);
  }
}
