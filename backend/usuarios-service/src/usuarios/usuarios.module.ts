import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rol } from '../auth/rol.enum.js';
import { AdminController } from './admin.controller.js';
import { EnfermerosController } from './enfermeros.controller.js';
import { PerfilController } from './perfil.controller.js';
import { SeedService } from './seed.service.js';
import {
  Admin,
  AdminSchema,
  Enfermero,
  EnfermeroSchema,
  Paciente,
  PacienteSchema,
  Usuario,
  UsuarioSchema,
} from './usuario.schema.js';
import { UsuariosService } from './usuarios.service.js';

// Usuario es el modelo base; Paciente, Enfermero y Admin son discriminators (herencia).
// El "value" es lo que queda guardado en el campo rol.
const modelos = MongooseModule.forFeature([
  {
    name: Usuario.name,
    schema: UsuarioSchema,
    discriminators: [
      { name: Paciente.name, schema: PacienteSchema, value: Rol.PACIENTE },
      { name: Enfermero.name, schema: EnfermeroSchema, value: Rol.ENFERMERO },
      { name: Admin.name, schema: AdminSchema, value: Rol.ADMIN },
    ],
  },
]);

@Module({
  imports: [modelos],
  controllers: [PerfilController, EnfermerosController, AdminController],
  providers: [UsuariosService, SeedService],
  exports: [modelos, UsuariosService],
})
export class UsuariosModule {}
