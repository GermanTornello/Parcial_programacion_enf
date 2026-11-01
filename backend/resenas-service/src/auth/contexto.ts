import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/** Devuelve el request HTTP tanto en un controlador REST como en un resolver de GraphQL. */
export function requestDe(context: ExecutionContext) {
  if (context.getType<'http' | 'graphql'>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext().req;
  }
  return context.switchToHttp().getRequest();
}
