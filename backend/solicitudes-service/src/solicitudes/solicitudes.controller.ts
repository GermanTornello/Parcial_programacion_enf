import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Rol, type UsuarioToken } from '../auth/rol.enum.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { CreateSolicitudDto } from './dto/create-solicitud.dto.js';
import { FiltroSolicitudesDto } from './dto/filtro-solicitudes.dto.js';
import { MotivoDto } from './dto/motivo.dto.js';
import { SolicitudesService } from './solicitudes.service.js';

@ApiTags('solicitudes')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin token o token inválido' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @Roles(Rol.PACIENTE)
  @ApiOperation({ summary: 'El paciente pide un servicio a un enfermero' })
  @ApiResponse({ status: 201, description: 'Solicitud creada en estado PENDIENTE' })
  @ApiResponse({ status: 400, description: 'Datos inválidos, fecha fuera de rango o enfermero no habilitado' })
  @ApiResponse({ status: 409, description: 'Horario ocupado o 5 solicitudes pendientes' })
  create(@UsuarioActual() usuario: UsuarioToken, @Body() dto: CreateSolicitudDto) {
    return this.solicitudesService.create(usuario, dto);
  }

  @Get()
  @ApiOperation({ summary: 'PACIENTE: las suyas · ENFERMERO: las que recibió · ADMIN: todas' })
  findAll(@UsuarioActual() usuario: UsuarioToken, @Query() filtros: FiltroSolicitudesDto) {
    return this.solicitudesService.findAll(usuario, filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una solicitud (participantes o ADMIN)' })
  @ApiResponse({ status: 403, description: 'No participa de la solicitud' })
  @ApiResponse({ status: 404, description: 'La solicitud no existe' })
  findOne(@UsuarioActual() usuario: UsuarioToken, @Param('id') id: string) {
    return this.solicitudesService.findOne(usuario, id);
  }

  @Patch(':id/aceptar')
  @Roles(Rol.ENFERMERO)
  @ApiOperation({ summary: 'El enfermero acepta una solicitud PENDIENTE' })
  aceptar(@UsuarioActual() usuario: UsuarioToken, @Param('id') id: string) {
    return this.solicitudesService.aceptar(usuario, id);
  }

  @Patch(':id/rechazar')
  @Roles(Rol.ENFERMERO)
  @ApiOperation({ summary: 'El enfermero rechaza una solicitud PENDIENTE (motivo opcional)' })
  rechazar(@UsuarioActual() usuario: UsuarioToken, @Param('id') id: string, @Body() dto: MotivoDto) {
    return this.solicitudesService.rechazar(usuario, id, dto.motivo);
  }

  @Patch(':id/cancelar')
  @Roles(Rol.PACIENTE, Rol.ENFERMERO)
  @ApiOperation({ summary: 'Cancela una solicitud PENDIENTE o ACEPTADA (motivo obligatorio si cancela el enfermero)' })
  cancelar(@UsuarioActual() usuario: UsuarioToken, @Param('id') id: string, @Body() dto: MotivoDto) {
    return this.solicitudesService.cancelar(usuario, id, dto.motivo);
  }

  @Patch(':id/realizar')
  @Roles(Rol.ENFERMERO)
  @ApiOperation({ summary: 'El enfermero marca como REALIZADA una solicitud ACEPTADA' })
  realizar(@UsuarioActual() usuario: UsuarioToken, @Param('id') id: string) {
    return this.solicitudesService.realizar(usuario, id);
  }
}
