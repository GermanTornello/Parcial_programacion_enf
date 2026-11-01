import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { UsuarioToken } from '../auth/rol.enum.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import { UsuariosService } from './usuarios.service.js';

@ApiTags('perfil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Patch()
  @ApiOperation({
    summary: 'Editar mi perfil',
    description:
      'Cada rol edita solo sus campos. No se puede cambiar rol, email ni estadoVerificacion. ' +
      'El enfermero manda la ubicación como { lat, lng }; si cambia la matrícula, vuelve a revisión.',
  })
  @ApiOkResponse({ description: 'Perfil actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description: 'La matrícula ya la tiene otro enfermero',
  })
  @ApiUnauthorizedResponse({ description: 'Sin token o token inválido' })
  actualizar(
    @UsuarioActual() usuario: UsuarioToken,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuariosService.actualizarPerfil(usuario, dto);
  }
}
