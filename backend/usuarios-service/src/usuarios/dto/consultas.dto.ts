import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Rol } from '../../auth/rol.enum.js';
import {
  aBooleano,
  aNumero,
  recortar,
  sinVacio,
} from '../../common/validacion.js';
import { DEPARTAMENTOS } from '../departamentos.js';
import { EstadoVerificacion } from '../usuario.schema.js';

// Los filtros llegan por query string: un filtro vacío ("") se toma como "sin filtro".
export class BuscarEnfermerosDto {
  @ApiPropertyOptional({
    example: -32.8895,
    description:
      'Va junto con lng. Si no se mandan, se usa el centro de Mendoza capital',
  })
  @Transform(aNumero)
  // Si viene una sola de las dos coordenadas, la otra pasa a ser obligatoria
  @ValidateIf(
    (dto: BuscarEnfermerosDto) =>
      dto.lat !== undefined || dto.lng !== undefined,
  )
  @IsLatitude({ message: 'La latitud no es válida' })
  @IsDefined({ message: 'Mandá la latitud y la longitud juntas' })
  lat?: number;

  @ApiPropertyOptional({ example: -68.8458 })
  @Transform(aNumero)
  @ValidateIf(
    (dto: BuscarEnfermerosDto) =>
      dto.lat !== undefined || dto.lng !== undefined,
  )
  @IsLongitude({ message: 'La longitud no es válida' })
  @IsDefined({ message: 'Mandá la latitud y la longitud juntas' })
  lng?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Transform(aNumero)
  @Max(200, { message: 'El radio puede ser de hasta 200 km' })
  @Min(1, { message: 'El radio tiene que ser de al menos 1 km' })
  @IsNumber({}, { message: 'El radio tiene que ser un número' })
  radioKm?: number;

  @ApiPropertyOptional({ example: 'Geriatría' })
  @IsOptional()
  @Transform(sinVacio)
  @IsString({ message: '$property tiene que ser un texto' })
  @MaxLength(60, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  especialidad?: string;

  @ApiPropertyOptional({ example: '650000000000000000000002' })
  @IsOptional()
  @Transform(sinVacio)
  @IsMongoId({ message: 'El servicio no es válido' })
  servicioId?: string;

  @ApiPropertyOptional({ enum: DEPARTAMENTOS })
  @IsOptional()
  @Transform(sinVacio)
  @IsIn(DEPARTAMENTOS, { message: 'Elegí un departamento de Mendoza' })
  departamento?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean({ message: 'disponible tiene que ser true o false' })
  disponible?: boolean;
}

export class FiltroEnfermerosAdminDto {
  @ApiPropertyOptional({
    enum: EstadoVerificacion,
    example: EstadoVerificacion.PENDIENTE,
  })
  @IsOptional()
  @Transform(sinVacio)
  @IsIn(Object.values(EstadoVerificacion), {
    message: 'El estado tiene que ser PENDIENTE, APROBADO o RECHAZADO',
  })
  estado?: EstadoVerificacion;
}

export class FiltroUsuariosAdminDto {
  @ApiPropertyOptional({ enum: Rol })
  @IsOptional()
  @Transform(sinVacio)
  @IsIn(Object.values(Rol), {
    message: 'El rol tiene que ser PACIENTE, ENFERMERO o ADMIN',
  })
  rol?: Rol;

  @ApiPropertyOptional({ description: 'Busca en nombre, apellido y email' })
  @IsOptional()
  @Transform(sinVacio)
  @IsString({ message: '$property tiene que ser un texto' })
  @MaxLength(100, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  search?: string;
}

export class VerificacionDto {
  @ApiProperty({
    enum: [EstadoVerificacion.APROBADO, EstadoVerificacion.RECHAZADO],
  })
  @IsIn([EstadoVerificacion.APROBADO, EstadoVerificacion.RECHAZADO], {
    message: 'El estado tiene que ser APROBADO o RECHAZADO',
  })
  estado: EstadoVerificacion.APROBADO | EstadoVerificacion.RECHAZADO;

  // Solo se valida al rechazar (al aprobar se ignora). Se recorta antes de validar, así un
  // motivo hecho solo de espacios no pasa. Con stopAtFirstError se evalúa primero el
  // decorador de más abajo: IsString → MinLength → MaxLength.
  @ApiPropertyOptional({
    description: 'Obligatorio si se rechaza (entre 10 y 500 caracteres)',
  })
  @Transform(recortar)
  @ValidateIf(
    (dto: VerificacionDto) => dto.estado === EstadoVerificacion.RECHAZADO,
  )
  @MaxLength(500, { message: 'El motivo puede tener hasta 500 caracteres' })
  @MinLength(10, {
    message:
      'Escribí el motivo del rechazo para que el enfermero sepa qué corregir (mínimo 10 caracteres)',
  })
  @IsString({
    message:
      'Escribí el motivo del rechazo para que el enfermero sepa qué corregir',
  })
  motivo?: string;
}
