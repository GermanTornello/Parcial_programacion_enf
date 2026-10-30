import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreateServicioInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @Field(() => Int)
  @IsInt()
  @Min(5)
  duracionEstimadaMin: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  precioReferencia: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
