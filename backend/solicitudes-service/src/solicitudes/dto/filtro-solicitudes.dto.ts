import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { EstadoSolicitud } from '../estados.js';

export class FiltroSolicitudesDto {
  @ApiPropertyOptional({ enum: EstadoSolicitud })
  @IsOptional()
  @IsEnum(EstadoSolicitud, { message: 'El estado no es válido' })
  estado?: EstadoSolicitud;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Desde esta fecha (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "desde" tiene que tener el formato AAAA-MM-DD' })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Hasta esta fecha (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "hasta" tiene que tener el formato AAAA-MM-DD' })
  hasta?: string;
}
