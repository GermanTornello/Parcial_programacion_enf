import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearMensajeDto {
  @ApiProperty({ example: 'Hola Laura, ¿podés tocar el timbre del 2° B?', maxLength: 1000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Escribí un mensaje' })
  @MaxLength(1000, { message: 'El mensaje puede tener hasta 1000 caracteres' })
  texto: string;
}
