import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MaxBytes, Opcional } from '../../common/validacion.js';
import { DEPARTAMENTOS } from '../../usuarios/departamentos.js';

// Misma regla que Enfered (PP3): bcrypt solo usa los primeros 72 bytes
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;

export class UbicacionDto {
  @ApiProperty({ example: -32.8895 })
  @IsLatitude({ message: 'La latitud no es válida' })
  lat: number;

  @ApiProperty({ example: -68.8458 })
  @IsLongitude({ message: 'La longitud no es válida' })
  lng: number;
}

/**
 * Datos comunes a cualquier usuario (contrato, sección 2.6).
 * Con stopAtFirstError se evalúa primero el decorador de más abajo: por eso el chequeo
 * principal de cada campo (IsNotEmpty, MinLength) va último.
 */
export class RegistroBaseDto {
  @ApiProperty({ example: 'Ana' })
  @MaxLength(60, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'Ingresá tu nombre' })
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @MaxLength(60, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'Ingresá tu apellido' })
  apellido: string;

  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail({}, { message: 'Ingresá un email válido' })
  email: string;

  @ApiProperty({
    example: 'Secreta123',
    minLength: MIN_PASSWORD,
    maxLength: MAX_PASSWORD,
  })
  @MaxBytes(MAX_PASSWORD, {
    message: 'La contraseña es demasiado larga (máximo 72 caracteres)',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @MinLength(MIN_PASSWORD, {
    message: `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres`,
  })
  password: string;

  @ApiProperty({ example: '2615551234' })
  // Matches ya rechaza lo que no es texto: así un teléfono que falta dice "Ingresá un teléfono válido"
  @Matches(/^[0-9 +()-]{6,20}$/, { message: 'Ingresá un teléfono válido' })
  telefono: string;

  @ApiProperty({ example: 'San Martín 1234, Mendoza' })
  @MaxLength(200, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'Ingresá tu dirección' })
  direccion: string;
}

export class RegistroPacienteDto extends RegistroBaseDto {
  @ApiProperty({ example: '30111222' })
  @Matches(/^\d{7,8}$/, {
    message: 'El DNI tiene que tener 7 u 8 números, sin puntos',
  })
  dni: string;

  @ApiPropertyOptional({ example: '1990-05-20' })
  @Opcional()
  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fechaNacimiento?: string;

  @ApiPropertyOptional({ example: 'OSEP' })
  @Opcional()
  @MaxLength(100, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  obraSocial?: string;

  @ApiPropertyOptional({ example: 'Alérgica a la penicilina' })
  @Opcional()
  @MaxLength(1000, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  datosMedicos?: string;
}

export class RegistroEnfermeroDto extends RegistroBaseDto {
  @ApiProperty({ example: 'MP-12345' })
  @MaxLength(30, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: 'Ingresá tu matrícula' })
  @IsNotEmpty({ message: 'Ingresá tu matrícula' })
  matricula: string;

  @ApiPropertyOptional({ example: ['Geriatría', 'Heridas'] })
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

  @ApiProperty({ enum: DEPARTAMENTOS, example: 'Capital' })
  @IsIn(DEPARTAMENTOS, { message: 'Elegí un departamento de Mendoza' })
  departamento: string;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @Opcional()
  @Min(0, { message: 'Los años de experiencia no pueden ser negativos' })
  @Max(60, { message: '$property puede ser como máximo $constraint1' })
  @IsInt({ message: 'Los años de experiencia tienen que ser un número entero' })
  aniosExperiencia?: number;

  @ApiPropertyOptional({ example: 8000 })
  @Opcional()
  @Min(0, { message: 'La tarifa no puede ser negativa' })
  @IsNumber({}, { message: '$property tiene que ser un número' })
  tarifaHora?: number;

  @ApiPropertyOptional({
    example: ['650000000000000000000001'],
    description:
      'Ids del catálogo de servicios; los repetidos se guardan una sola vez',
  })
  @Opcional()
  @IsMongoId({ each: true, message: 'Algún servicio no es válido' })
  @IsArray({ message: '$property tiene que ser una lista' })
  serviciosOfrecidos?: string[];

  @ApiProperty({ type: UbicacionDto })
  @ValidateNested({ message: 'Indicá la ubicación con lat y lng' })
  @Type(() => UbicacionDto)
  @IsNotEmpty({ message: 'Indicá tu ubicación' })
  ubicacion: UbicacionDto;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Opcional()
  @Min(1, { message: '$property tiene que ser al menos $constraint1' })
  @Max(100, { message: '$property puede ser como máximo $constraint1' })
  @IsNumber({}, { message: '$property tiene que ser un número' })
  radioCoberturaKm?: number;

  @ApiPropertyOptional({
    example: 'Enfermera con experiencia en adultos mayores',
  })
  @Opcional()
  @MaxLength(1000, {
    message: '$property puede tener hasta $constraint1 caracteres',
  })
  @IsString({ message: '$property tiene que ser un texto' })
  descripcion?: string;
}
