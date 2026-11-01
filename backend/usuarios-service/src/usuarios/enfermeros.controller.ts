import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BuscarEnfermerosDto } from './dto/consultas.dto.js';
import { UsuariosService } from './usuarios.service.js';

@ApiTags('enfermeros')
@Controller('enfermeros')
export class EnfermerosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Va antes de ":id" para que "buscar" no se tome como un id
  @Get('buscar')
  @ApiOperation({
    summary: 'Buscar enfermeros aprobados cerca de un punto',
    description:
      'Ordenados por distancia ($geoNear). Cada resultado trae distanciaKm con un decimal.',
  })
  @ApiOkResponse({ description: 'Lista de enfermeros con distanciaKm' })
  buscar(@Query() consulta: BuscarEnfermerosDto) {
    return this.usuariosService.buscarEnfermeros(consulta);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Perfil público de un enfermero (sin email ni contraseña)',
  })
  @ApiOkResponse({ description: 'Perfil del enfermero' })
  @ApiNotFoundResponse({ description: 'El enfermero no existe' })
  perfilPublico(@Param('id') id: string) {
    return this.usuariosService.enfermeroPublico(id);
  }
}
