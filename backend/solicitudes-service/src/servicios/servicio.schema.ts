import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// La misma clase define el documento de MongoDB y el tipo de GraphQL
@ObjectType({ description: 'Servicio del catálogo (ej: aplicación de inyectable)' })
@Schema({
  collection: 'servicios',
  timestamps: true,
  // Cuando aparece dentro de una solicitud (REST) también va con "id" en lugar de "_id"
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_documento, salida: Record<string, unknown>) => {
      delete salida._id;
      return salida;
    },
  },
})
export class Servicio {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  @Prop({ required: true, unique: true, trim: true })
  nombre: string;

  @Field(() => String, { nullable: true })
  @Prop({ trim: true })
  descripcion?: string;

  @Field(() => Int, { description: 'Duración estimada en minutos (60 si no se indica)' })
  @Prop({ required: true, min: 5, default: 60 })
  duracionEstimadaMin: number;

  @Field(() => Float, { description: 'Precio de referencia (solo informativo)' })
  @Prop({ required: true, min: 0 })
  precioReferencia: number;

  @Field(() => Boolean)
  @Prop({ default: true })
  activo: boolean;
}

export type ServicioDocument = HydratedDocument<Servicio>;
export const ServicioSchema = SchemaFactory.createForClass(Servicio);
