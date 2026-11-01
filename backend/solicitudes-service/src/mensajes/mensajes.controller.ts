import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { type UsuarioToken } from '../auth/rol.enum.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { CrearMensajeDto } from './dto/crear-mensaje.dto.js';
import { MensajesService } from './mensajes.service.js';

@ApiTags('chat')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin token o token inválido' })
@ApiResponse({ status: 403, description: 'No participa de la solicitud' })
@ApiResponse({ status: 404, description: 'La solicitud no existe' })
@UseGuards(JwtAuthGuard)
@Controller('solicitudes/:id/mensajes')
export class MensajesController {
  constructor(private readonly mensajesService: MensajesService) {}

  @Get()
  @ApiOperation({ summary: 'Mensajes del chat en orden cronológico (el front lo consulta cada 3 s)' })
  listar(@UsuarioActual() usuario: UsuarioToken, @Param('id') id: string) {
    return this.mensajesService.listar(usuario, id);
  }

  @Post()
  @ApiOperation({ summary: 'Envía un mensaje (solo si la solicitud está PENDIENTE o ACEPTADA)' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado' })
  @ApiResponse({ status: 400, description: 'Mensaje vacío o chat cerrado' })
  enviar(@UsuarioActual() usuario: UsuarioToken, @Param('id') id: string, @Body() dto: CrearMensajeDto) {
    return this.mensajesService.enviar(usuario, id, dto);
  }
}
