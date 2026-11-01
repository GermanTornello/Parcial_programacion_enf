import { InputType, OmitType, PartialType } from '@nestjs/graphql';
import { CreateResenaInput } from './create-resena.input.js';

// Se puede cambiar la puntuación y el comentario, pero no de qué solicitud es
@InputType()
export class UpdateResenaInput extends PartialType(OmitType(CreateResenaInput, ['solicitudId'] as const)) {}
