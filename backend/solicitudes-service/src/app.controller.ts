import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('estado')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Verifica que el servicio esté funcionando' })
  estado() {
    return { servicio: 'solicitudes-service', estado: 'ok' };
  }
}
