import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { requestDe } from './contexto.js';
import { UsuarioToken } from './rol.enum.js';

/** Inyecta el usuario logueado (sacado del token) en un controlador o resolver. */
export const UsuarioActual = createParamDecorator(
  (_: unknown, context: ExecutionContext): UsuarioToken => requestDe(context).user,
);
