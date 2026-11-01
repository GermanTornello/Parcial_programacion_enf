import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Rol } from '../auth/rol.enum.js';
import { DEPARTAMENTOS } from './departamentos.js';

export enum EstadoVerificacion {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

// Todas las respuestas devuelven "id" (no "_id") y nunca la contraseña (contrato, sección 2.3)
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_documento: unknown, salida: Record<string, unknown>) => {
    delete salida._id;
    delete salida.password;
    return salida;
  },
};

/**
 * Usuario base. Paciente, Enfermero y Admin heredan de acá con discriminators de Mongoose:
 * todos viven en la colección "usuarios" y el campo "rol" dice de qué tipo es cada uno.
 * Es la herencia del diagrama de clases de Enfered.
 */
@Schema({
  collection: 'usuarios',
  discriminatorKey: 'rol',
  timestamps: true,
  toJSON,
})
export class Usuario {
  id: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, trim: true })
  apellido: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // select: false → no viaja en ninguna consulta salvo que se pida explícitamente (login)
  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, trim: true })
  telefono: string;

  @Prop({ required: true, trim: true })
  direccion: string;

  @Prop({ type: String, required: true, enum: Object.values(Rol) })
  rol: Rol;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
// dni y matrícula son de las clases hijas, pero el índice único va en la colección compartida.
// sparse: los usuarios que no tienen ese campo no chocan entre sí.
UsuarioSchema.index({ dni: 1 }, { unique: true, sparse: true });
UsuarioSchema.index({ matricula: 1 }, { unique: true, sparse: true });
// Índice geoespacial para $geoNear (los documentos sin ubicación se ignoran)
UsuarioSchema.index({ ubicacion: '2dsphere' });
// Panel admin: enfermeros por estado (más antiguos primero) y listado ordenado por apellido
UsuarioSchema.index({ rol: 1, estadoVerificacion: 1, createdAt: 1 });
UsuarioSchema.index({ apellido: 1, nombre: 1 });

@Schema({ _id: false })
export class Punto {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: 'Point';

  /** [lng, lat]: GeoJSON va con la longitud primero */
  @Prop({ type: [Number], required: true })
  coordinates: number[];
}
const PuntoSchema = SchemaFactory.createForClass(Punto);

@Schema({ _id: false })
export class FranjaDisponibilidad {
  /** 0 = domingo … 6 = sábado */
  @Prop({ required: true, min: 0, max: 6 })
  dia: number;

  @Prop({ required: true })
  desde: string;

  @Prop({ required: true })
  hasta: string;
}
const FranjaSchema = SchemaFactory.createForClass(FranjaDisponibilidad);

@Schema({ toJSON })
export class Paciente {
  @Prop({ required: true, trim: true })
  dni: string;

  @Prop()
  fechaNacimiento?: Date;

  @Prop({ trim: true })
  obraSocial?: string;

  @Prop({ trim: true })
  datosMedicos?: string;
}
export const PacienteSchema = SchemaFactory.createForClass(Paciente);

@Schema({ toJSON })
export class Enfermero {
  @Prop({ required: true, trim: true })
  matricula: string;

  @Prop({ type: [String], default: [] })
  especialidades: string[];

  @Prop({ type: String, required: true, enum: DEPARTAMENTOS })
  departamento: string;

  @Prop({ default: 0, min: 0 })
  aniosExperiencia: number;

  @Prop({ min: 0 })
  tarifaHora?: number;

  /** Ids de Servicio (catálogo de solicitudes-service): relación muchos-a-muchos Enfermero ↔ Servicio */
  @Prop({ type: [String], default: [] })
  serviciosOfrecidos: string[];

  @Prop({ type: PuntoSchema, required: true })
  ubicacion: Punto;

  @Prop({ default: 10, min: 1 })
  radioCoberturaKm: number;

  @Prop({ default: true })
  disponible: boolean;

  @Prop({ type: [FranjaSchema], default: [] })
  disponibilidad: FranjaDisponibilidad[];

  @Prop({ trim: true })
  descripcion?: string;

  @Prop({
    type: String,
    enum: Object.values(EstadoVerificacion),
    default: EstadoVerificacion.PENDIENTE,
  })
  estadoVerificacion: EstadoVerificacion;

  @Prop({ trim: true })
  motivoRechazo?: string;
}
export const EnfermeroSchema = SchemaFactory.createForClass(Enfermero);

@Schema({ toJSON })
export class Admin {}
export const AdminSchema = SchemaFactory.createForClass(Admin);

// Las clases hijas declaran solo sus campos propios: los comunes los hereda el discriminator.
// Para TypeScript, un paciente completo es Usuario + Paciente.
export type UsuarioPaciente = Usuario & Paciente;
export type UsuarioEnfermero = Usuario & Enfermero;
export type UsuarioAdmin = Usuario & Admin;
export type UsuarioDocument = HydratedDocument<Usuario>;
