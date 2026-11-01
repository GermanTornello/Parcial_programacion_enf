import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Opcional } from '../../common/validacion.js';
import { UbicacionDto } from '../../auth/dto/registro.dto.js';
import { DEPARTAMENTOS } from '../departamentos.js';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export class FranjaDto {
  @ApiPropertyOptional({ example: 1, description: '0 = domingo … 6 = sábado' })
  @Min(0, { message: '$property tiene que ser al menos $constraint1' })
  @Max(6, { message: '$property puede ser como máximo $constraint1' })
  @IsInt({ message: '$property tiene que ser un número entero' })
  dia: number;

  @ApiPropertyOptional({ example: '09:00' })
  @Matches(HORA, {
    message: 'La hora "desde" tiene que tener el formato HH:mm',
  })
  desde: string;

  @ApiPropertyOptional({ example: '13:00' })
  @Matches(HORA, {
    message: 'La hora "hasta" tiene que tener el formato HH:mm',
  })
  hasta: string;
}

/**
 * Todo lo que se puede editar del perfil. El servicio toma solo los campos del rol de quien edita.
 * rol, email y estadoVerificacion no están acá: el ValidationPipe (whitelist) los descarta.
 */
export class ActualizarPerfilDto {
  // Comunes
  @ApiPropertyOptional()
  @Opcional()
  @MaxLength(60, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío' })
  nombre?: string;

  @ApiPropertyOptional()
  @Opcional()
  @MaxLength(60, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'El apellido no puede quedar vacío' })
  apellido?: string;

  @ApiPropertyOptional()
  @Opcional()
  @Matches(/^[0-9 +()-]{6,20}$/, { message: 'Ingresá un teléfono válido' })
  telefono?: string;

  @ApiPropertyOptional()
  @Opcional()
  @MaxLength(200, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'La dirección no puede quedar vacía' })
  direccion?: string;

  // Paciente
  @ApiPropertyOptional({ description: 'Solo paciente' })
  @Opcional()
  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fechaNacimiento?: string;

  @ApiPropertyOptional({ description: 'Solo paciente' })
  @Opcional()
  @MaxLength(100, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  obraSocial?: string;

  @ApiPropertyOptional({ description: 'Solo paciente' })
  @Opcional()
  @MaxLength(1000, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  datosMedicos?: string;

  // Enfermero
  @ApiPropertyOptional({
    description: 'Solo enfermero. Si cambia, la matrícula vuelve a revisión',
  })
  @Opcional()
  @MaxLength(30, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'La matrícula no puede quedar vacía' })
  matricula?: string;

  @ApiPropertyOptional({ description: 'Solo enfermero' })
  @Opcional()
  @ArrayMaxSize(10, {
    message: '$property puede tener hasta $constraint1 elementos',
  })
  @IsString({
    each: true,
    message: 'Cada elemento de $property tiene que ser un texto',
  })
  @IsArray({ message: '$property tiene que ser una lista' })
  especialidades?: string[];

  @ApiPropertyOptional({ enum: DEPARTAMENTOS, description: 'Solo enfermero' })
  @Opcional()
  @IsIn(DEPARTAMENTOS, { message: 'Elegí un departamento de Mendoza' })
  departamento?: string;

  @ApiPropertyOptional({ description: 'Solo enfermero' })
  @Opcional()
  @Min(0, { message: 'Los años de experiencia no pueden ser negativos' })
  @Max(60, { message: '$property puede ser como máximo $constraint1' })
  @IsInt({ message: '$property tiene que ser un número entero' })
  aniosExperiencia?: number;

  @ApiPropertyOptional({ description: 'Solo enfermero' })
  @Opcional()
  @Min(0, { message: 'La tarifa no puede ser negativa' })
  @IsNumber({}, { message: '$property tiene que ser un número' })
  tarifaHora?: number;

  @ApiPropertyOptional({
    description:
      'Solo enfermero. Ids del catálogo; los repetidos se guardan una sola vez',
  })
  @Opcional()
  @IsMongoId({ each: true, message: 'Algún servicio no es válido' })
  @IsArray({ message: '$property tiene que ser una lista' })
  serviciosOfrecidos?: string[];

  @ApiPropertyOptional({ type: UbicacionDto, description: 'Solo enfermero' })
  @Opcional()
  @ValidateNested({ message: 'Indicá la ubicación con lat y lng' })
  @Type(() => UbicacionDto)
  ubicacion?: UbicacionDto;

  @ApiPropertyOptional({ description: 'Solo enfermero' })
  @Opcional()
  @Min(1, { message: '$property tiene que ser al menos $constraint1' })
  @Max(100, { message: '$property puede ser como máximo $constraint1' })
  @IsNumber({}, { message: '$property tiene que ser un número' })
  radioCoberturaKm?: number;

  @ApiPropertyOptional({ description: 'Solo enfermero' })
  @Opcional()
  @IsBoolean({ message: '$property tiene que ser true o false' })
  disponible?: boolean;

  @ApiPropertyOptional({ type: [FranjaDto], description: 'Solo enfermero' })
  @Opcional()
  @ArrayMaxSize(21, {
    message: '$property puede tener hasta $constraint1 elementos',
  })
  @ValidateNested({
    each: true,
    message: 'Cada horario tiene que tener dia, desde y hasta',
  })
  @Type(() => FranjaDto)
  @IsArray({ message: '$property tiene que ser una lista' })
  disponibilidad?: FranjaDto[];

  @ApiPropertyOptional({ description: 'Solo enfermero' })
  @Opcional()
  @MaxLength(1000, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  descripcion?: string;
}
