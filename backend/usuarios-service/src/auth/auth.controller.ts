import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import {
  RegistroEnfermeroDto,
  RegistroPacienteDto,
} from './dto/registro.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { UsuarioToken } from './rol.enum.js';
import { UsuarioActual } from './usuario-actual.decorator.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Post('register/paciente')
  // Cada registro cuesta un hash bcrypt: también se limita para que no se pueda saturar el servicio
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Registrar un paciente' })
  @ApiCreatedResponse({ description: 'Paciente creado (sin la contraseña)' })
  @ApiConflictResponse({
    description: 'El email o el DNI ya están registrados',
  })
  registrarPaciente(@Body() dto: RegistroPacienteDto) {
    return this.authService.registrarPaciente(dto);
  }

  @Post('register/enfermero')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary:
      'Registrar un enfermero (queda PENDIENTE hasta que el admin valide la matrícula)',
  })
  @ApiCreatedResponse({
    description: 'Enfermero creado con estadoVerificacion PENDIENTE',
  })
  @ApiConflictResponse({
    description: 'El email o la matrícula ya están registrados',
  })
  registrarEnfermero(@Body() dto: RegistroEnfermeroDto) {
    return this.authService.registrarEnfermero(dto);
  }

  @Post('login')
  @HttpCode(200)
  // Límite de intentos: frena a quien prueba contraseñas en serie
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary:
      'Iniciar sesión: devuelve el token JWT y los datos básicos del usuario',
  })
  @ApiOkResponse({
    description: '{ access_token, user: { id, nombre, apellido, email, rol } }',
  })
  @ApiUnauthorizedResponse({ description: 'Email o contraseña incorrectos' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos seguidos' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Datos completos del usuario logueado (sin la contraseña)',
  })
  @ApiUnauthorizedResponse({ description: 'Sin token o token inválido' })
  me(@UsuarioActual() usuario: UsuarioToken) {
    return this.usuariosService.perfil(usuario.id);
  }
}
