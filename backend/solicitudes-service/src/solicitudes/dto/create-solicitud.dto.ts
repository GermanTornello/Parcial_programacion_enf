import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSolicitudDto {
  @ApiProperty({ example: '650000000000000000000c01', description: 'id del enfermero (usuarios-service)' })
  @IsMongoId({ message: 'El enfermero no es válido' })
  enfermeroId: string;

  @ApiProperty({ example: '650000000000000000000002', description: 'id del servicio del catálogo' })
  @IsMongoId({ message: 'El servicio no es válido' })
  servicioId: string;

  @ApiProperty({ example: '2026-11-05', description: 'Día del turno (AAAA-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha tiene que tener el formato AAAA-MM-DD' })
  fecha: string;

  @ApiProperty({ example: '10:00', description: 'Hora del turno (HH:mm, hora de Argentina)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora tiene que tener el formato HH:mm' })
  hora: string;

  @ApiProperty({ example: 'San Martín 1234, Ciudad de Mendoza' })
  @IsString()
  @IsNotEmpty({ message: 'Ingresá la dirección de atención' })
  @MaxLength(200)
  direccionAtencion: string;

  @ApiPropertyOptional({ example: 'Tocar timbre del 2° B' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
