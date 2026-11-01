import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Rol } from '../auth/rol.enum.js';
import { Servicio } from '../servicios/servicio.schema.js';
import { EstadoSolicitud } from './estados.js';

@Schema({
  collection: 'solicitudes',
  timestamps: true,
  // En las respuestas REST va "id" en lugar de "_id" (contrato, sección 2.3)
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_documento, salida: Record<string, unknown>) => {
      delete salida._id;
      return salida;
    },
  },
})
export class Solicitud {
  @Prop({ required: true, index: true })
  pacienteId: string;

  @Prop({ required: true })
  pacienteNombre: string;

  @Prop({ required: true, index: true })
  enfermeroId: string;

  @Prop({ required: true })
  enfermeroNombre: string;

  @Prop({ type: Types.ObjectId, ref: Servicio.name, required: true })
  servicio: Types.ObjectId;

  /** Día del turno (se guarda a las 00:00 UTC de esa fecha). */
  @Prop({ required: true })
  fecha: Date;

  /** Hora del turno en formato HH:mm (hora de Argentina). */
  @Prop({ required: true })
  hora: string;

  @Prop({ required: true, trim: true })
  direccionAtencion: string;

  @Prop({ trim: true })
  notas?: string;

  @Prop({ type: String, enum: EstadoSolicitud, default: EstadoSolicitud.PENDIENTE })
  estado: EstadoSolicitud;

  @Prop({ trim: true })
  motivoRechazo?: string;

  @Prop({ type: String, enum: [Rol.PACIENTE, Rol.ENFERMERO] })
  canceladaPor?: Rol;

  @Prop({ trim: true })
  motivoCancelacion?: string;
}

export type SolicitudDocument = HydratedDocument<Solicitud>;
export const SolicitudSchema = SchemaFactory.createForClass(Solicitud);
// Acelera la búsqueda de horarios repetidos del enfermero
SolicitudSchema.index({ enfermeroId: 1, fecha: 1, hora: 1 });
