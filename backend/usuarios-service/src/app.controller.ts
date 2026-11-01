import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('estado')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Estado del servicio' })
  @ApiOkResponse({
    description: "{ servicio: 'usuarios-service', estado: 'ok' }",
  })
  estado() {
    return { servicio: 'usuarios-service', estado: 'ok' };
  }
}
