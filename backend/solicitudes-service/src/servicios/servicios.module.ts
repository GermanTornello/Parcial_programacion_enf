import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Servicio, ServicioSchema } from './servicio.schema.js';
import { ServiciosResolver } from './servicios.resolver.js';
import { ServiciosService } from './servicios.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Servicio.name, schema: ServicioSchema }])],
  providers: [ServiciosResolver, ServiciosService],
  exports: [ServiciosService],
})
export class ServiciosModule {}
