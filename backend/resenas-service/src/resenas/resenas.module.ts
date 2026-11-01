import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resena, ResenaSchema } from './resena.schema.js';
import { ResenasResolver } from './resenas.resolver.js';
import { ResenasService } from './resenas.service.js';
import { SolicitudesClient } from './solicitudes.client.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Resena.name, schema: ResenaSchema }])],
  providers: [ResenasResolver, ResenasService, SolicitudesClient],
})
export class ResenasModule {}
