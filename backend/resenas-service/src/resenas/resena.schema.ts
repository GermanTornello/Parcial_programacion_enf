import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// La misma clase define el documento de MongoDB y el tipo de GraphQL
@ObjectType({ description: 'Calificación de un paciente a un enfermero por un servicio realizado' })
@Schema({ collection: 'resenas', timestamps: { createdAt: true, updatedAt: false } })
export class Resena {
  @Field(() => ID)
  id: string;

  /** Una solicitud tiene como máximo una reseña (relación 1 a 0..1). */
  @Field(() => String)
  @Prop({ required: true, unique: true })
  solicitudId: string;

  @Field(() => String)
  @Prop({ required: true, index: true })
  pacienteId: string;

  @Field(() => String)
  @Prop({ required: true })
  pacienteNombre: string;

  @Field(() => String)
  @Prop({ required: true, index: true })
  enfermeroId: string;

  @Field(() => Int, { description: 'De 1 a 5 estrellas' })
  @Prop({ required: true, min: 1, max: 5 })
  puntuacion: number;

  @Field(() => String, { nullable: true })
  @Prop({ trim: true, maxlength: 500 })
  comentario?: string;

  @Field(() => Date)
  createdAt: Date;
}

export type ResenaDocument = HydratedDocument<Resena>;
export const ResenaSchema = SchemaFactory.createForClass(Resena);
