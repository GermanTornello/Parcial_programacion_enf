import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MotivoDto {
  @ApiPropertyOptional({ example: 'Ese día no estoy en Mendoza', description: 'Obligatorio si cancela el enfermero' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
