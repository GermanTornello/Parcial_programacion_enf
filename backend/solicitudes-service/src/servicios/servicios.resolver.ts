import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Rol } from '../auth/rol.enum.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateServicioInput } from './dto/create-servicio.input.js';
import { UpdateServicioInput } from './dto/update-servicio.input.js';
import { Servicio } from './servicio.schema.js';
import { ServiciosService } from './servicios.service.js';

// Consultar el catálogo es público; crear, editar y borrar es solo para ADMIN
@Resolver(() => Servicio)
export class ServiciosResolver {
  constructor(private readonly serviciosService: ServiciosService) {}

  @Query(() => [Servicio], { name: 'servicios', description: 'Catálogo, con búsqueda por nombre' })
  findAll(
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('activo', { type: () => Boolean, nullable: true }) activo?: boolean,
  ) {
    return this.serviciosService.findAll(search, activo);
  }

  @Query(() => Servicio, { name: 'servicio', nullable: true })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.serviciosService.findOne(id);
  }

  @Mutation(() => Servicio)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  createServicio(@Args('input') input: CreateServicioInput) {
    return this.serviciosService.create(input);
  }

  @Mutation(() => Servicio)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  updateServicio(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateServicioInput,
  ) {
    return this.serviciosService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  removeServicio(@Args('id', { type: () => ID }) id: string) {
    return this.serviciosService.remove(id);
  }
}
