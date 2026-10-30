import { InputType, PartialType } from '@nestjs/graphql';
import { CreateServicioInput } from './create-servicio.input.js';

// Mismos campos y validaciones que al crear, pero todos opcionales
@InputType()
export class UpdateServicioInput extends PartialType(CreateServicioInput) {}
