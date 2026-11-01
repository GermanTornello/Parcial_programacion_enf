import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { requestDe } from './contexto.js';

/** El header Authorization tal cual llegó ("Bearer ..."), para reenviarlo a otro microservicio. */
export const TokenActual = createParamDecorator(
  (_: unknown, context: ExecutionContext): string => requestDe(context).headers.authorization ?? '',
);
