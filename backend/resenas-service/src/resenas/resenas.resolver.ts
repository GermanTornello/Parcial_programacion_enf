import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Rol, type UsuarioToken } from '../auth/rol.enum.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { TokenActual } from '../auth/token-actual.decorator.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { CreateResenaInput } from './dto/create-resena.input.js';
import { UpdateResenaInput } from './dto/update-resena.input.js';
import { Reputacion } from './reputacion.type.js';
import { Resena } from './resena.schema.js';
import { ResenasService } from './resenas.service.js';

@Resolver(() => Resena)
export class ResenasResolver {
  constructor(private readonly resenasService: ResenasService) {}

  @Query(() => [Resena], { name: 'resenas', description: 'Reseñas de un enfermero, las más nuevas primero' })
  delEnfermero(@Args('enfermeroId', { type: () => String }) enfermeroId: string) {
    return this.resenasService.delEnfermero(enfermeroId);
  }

  @Query(() => Resena, { name: 'resena', nullable: true })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.resenasService.findOne(id);
  }

  @Query(() => [Resena], { name: 'misResenas', description: 'Las reseñas que escribió el paciente logueado' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE)
  misResenas(@UsuarioActual() usuario: UsuarioToken) {
    return this.resenasService.delPaciente(usuario);
  }

  @Query(() => Reputacion, { name: 'reputacion' })
  reputacion(@Args('enfermeroId', { type: () => String }) enfermeroId: string) {
    return this.resenasService.reputacion(enfermeroId);
  }

  @Query(() => [Reputacion], { name: 'reputaciones', description: 'Para mostrar las estrellas en la lista de búsqueda' })
  reputaciones(@Args('enfermeroIds', { type: () => [String] }) enfermeroIds: string[]) {
    return this.resenasService.reputaciones(enfermeroIds);
  }

  @Mutation(() => Resena)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE)
  createResena(
    @UsuarioActual() usuario: UsuarioToken,
    @TokenActual() authorization: string,
    @Args('input') input: CreateResenaInput,
  ) {
    return this.resenasService.create(usuario, input, authorization);
  }

  @Mutation(() => Resena)
  @UseGuards(JwtAuthGuard)
  updateResena(
    @UsuarioActual() usuario: UsuarioToken,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateResenaInput,
  ) {
    return this.resenasService.update(usuario, id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  removeResena(@UsuarioActual() usuario: UsuarioToken, @Args('id', { type: () => ID }) id: string) {
    return this.resenasService.remove(usuario, id);
  }
}
