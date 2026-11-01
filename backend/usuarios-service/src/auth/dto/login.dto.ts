import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'paciente@enfered.com' })
  @IsEmail({}, { message: 'Ingresá un email válido' })
  email: string;

  @ApiProperty({ example: 'Paciente123!' })
  @IsString({ message: '$property tiene que ser un texto' })
  @IsNotEmpty({ message: 'Ingresá tu contraseña' })
  password: string;
}
