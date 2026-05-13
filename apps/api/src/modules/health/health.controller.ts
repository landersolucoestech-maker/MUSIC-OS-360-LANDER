import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check do servidor' })
  @ApiResponse({
    status: 200,
    description: 'Servidor saudável',
    schema: {
      example: {
        status: 'ok',
        version: '1.0.0',
        environment: 'development',
        timestamp: '2025-01-01T00:00:00.000Z',
        uptime_seconds: 42,
      },
    },
  })
  check() {
    return {
      status: 'ok',
      version: '1.0.0',
      environment: process.env['NODE_ENV'] ?? 'development',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
    };
  }
}
