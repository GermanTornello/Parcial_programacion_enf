import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Promedio de estrellas de un enfermero (0 y 0 si todavía no tiene reseñas)' })
export class Reputacion {
  @Field(() => String)
  enfermeroId: string;

  @Field(() => Float, { description: 'Promedio con un decimal, por ejemplo 4.5' })
  promedio: number;

  @Field(() => Int)
  cantidad: number;
}
