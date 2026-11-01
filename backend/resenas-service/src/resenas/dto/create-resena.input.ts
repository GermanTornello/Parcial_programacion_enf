import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

@InputType()
export class CreateResenaInput {
  @Field(() => String)
  @IsMongoId({ message: 'La solicitud no es válida' })
  solicitudId: string;

  @Field(() => Int)
  @IsInt({ message: 'La puntuación tiene que ser un número entero' })
  @Min(1, { message: 'La puntuación va de 1 a 5 estrellas' })
  @Max(5, { message: 'La puntuación va de 1 a 5 estrellas' })
  puntuacion: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'El comentario puede tener hasta 500 caracteres' })
  comentario?: string;
}
