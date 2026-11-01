import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Solicitud } from '../solicitudes/solicitud.schema.js';

// Chat de una solicitud: una solicitud tiene muchos mensajes (relación 1 a muchos)
@Schema({
  collection: 'mensajes',
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_documento, salida: Record<string, unknown>) => {
      delete salida._id;
      return salida;
    },
  },
})
export class Mensaje {
  @Prop({ type: Types.ObjectId, ref: Solicitud.name, required: true, index: true })
  solicitud: Types.ObjectId;

  @Prop({ required: true })
  autorId: string;

  @Prop({ required: true })
  autorNombre: string;

  @Prop({ required: true, trim: true, minlength: 1, maxlength: 1000 })
  texto: string;

  createdAt: Date;
}

export type MensajeDocument = HydratedDocument<Mensaje>;
export const MensajeSchema = SchemaFactory.createForClass(Mensaje);
