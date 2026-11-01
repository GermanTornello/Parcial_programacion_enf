import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Rol } from '../auth/rol.enum.js';
import type { UsuarioToken } from '../auth/rol.enum.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import {
  FiltroEnfermerosAdminDto,
  FiltroUsuariosAdminDto,
  VerificacionDto,
} from './dto/consultas.dto.js';
import { UsuariosService } from './usuarios.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin token o token inválido' })
@ApiForbiddenResponse({ description: 'Solo para ADMIN' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('enfermeros')
  @ApiOperation({
    summary: 'Enfermeros por estado de verificación (sin estado: todos)',
  })
  @ApiOkResponse({
    description: 'Lista de enfermeros, los más antiguos primero',
  })
  enfermeros(@Query() filtro: FiltroEnfermerosAdminDto) {
    return this.usuariosService.enfermerosPorEstado(filtro.estado);
  }

  @Patch('enfermeros/:id/verificacion')
  @ApiOperation({
    summary:
      'Aprobar o rechazar la matrícula de un enfermero (el motivo es obligatorio al rechazar)',
  })
  @ApiOkResponse({ description: 'Enfermero con el estado nuevo' })
  @ApiBadRequestResponse({
    description: 'Estado inválido o falta el motivo del rechazo',
  })
  @ApiNotFoundResponse({ description: 'El enfermero no existe' })
  verificar(@Param('id') id: string, @Body() dto: VerificacionDto) {
    return this.usuariosService.verificarMatricula(id, dto);
  }

  @Get('usuarios')
  @ApiOperation({
    summary: 'Listar y buscar usuarios (por nombre, apellido o email)',
  })
  @ApiOkResponse({ description: 'Lista de usuarios ordenada por apellido' })
  usuarios(@Query() filtro: FiltroUsuariosAdminDto) {
    return this.usuariosService.listarUsuarios(filtro);
  }

  @Delete('usuarios/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Borrar un usuario' })
  @ApiNoContentResponse({ description: 'Usuario borrado' })
  @ApiBadRequestResponse({
    description: 'El admin no puede borrarse a sí mismo',
  })
  @ApiNotFoundResponse({ description: 'El usuario no existe' })
  async borrar(@Param('id') id: string, @UsuarioActual() admin: UsuarioToken) {
    await this.usuariosService.borrarUsuario(id, admin.id);
  }
}
