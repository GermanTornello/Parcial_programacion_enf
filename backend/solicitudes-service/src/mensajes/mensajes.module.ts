import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SolicitudesModule } from '../solicitudes/solicitudes.module.js';
import { Mensaje, MensajeSchema } from './mensaje.schema.js';
import { MensajesController } from './mensajes.controller.js';
import { MensajesService } from './mensajes.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Mensaje.name, schema: MensajeSchema }]), SolicitudesModule],
  controllers: [MensajesController],
  providers: [MensajesService],
})
export class MensajesModule {}
