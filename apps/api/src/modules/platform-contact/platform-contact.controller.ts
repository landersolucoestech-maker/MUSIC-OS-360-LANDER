import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';
import { PlatformContactService } from './platform-contact.service';
import { PlatformContactDto } from './dto/platform-contact.dto';

/**
 * Platform Commercial Contact — contato institucional/comercial sobre o
 * próprio Music OS 360 (landing page). Deliberadamente sem @CurrentTenant()
 * e sem qualquer relação com tenant, Support Ticket ou MusicChat — ver
 * decisão de produto 2026-08-22.
 */
@ApiTags('Public') @Controller('public')
export class PlatformContactController {
  constructor(private readonly svc: PlatformContactService) {}

  @Public()
  @Post('platform-contact')
  @ApiOperation({ summary: 'Contato comercial/institucional sobre o Music OS 360 (não pertence a nenhum tenant)' })
  submit(@Body() dto: PlatformContactDto) {
    return this.svc.submit(dto);
  }
}
