import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiciosModule } from '../servicios/servicios.module.js';
import { Solicitud, SolicitudSchema } from './solicitud.schema.js';
import { SolicitudesController } from './solicitudes.controller.js';
import { SolicitudesService } from './solicitudes.service.js';
import { UsuariosClient } from './usuarios.client.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Solicitud.name, schema: SolicitudSchema }]), ServiciosModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService, UsuariosClient],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
