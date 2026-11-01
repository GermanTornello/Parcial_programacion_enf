import { isValidObjectId } from 'mongoose';

/** Error de índice único de MongoDB (email, dni o matrícula repetidos). */
export const esDuplicado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === 11000;

/** Un id que no es un ObjectId nunca va a existir: se trata igual que "no encontrado". */
export const esIdValido = (id: string): boolean => isValidObjectId(id);

/** Escapa un texto para usarlo dentro de una expresión regular (búsquedas del admin). */
export const escaparRegex = (texto: string): string =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
