import { ValidateBy, ValidateIf, ValidationOptions } from 'class-validator';

/**
 * Campo opcional que solo se saltea si NO viene. A diferencia de @IsOptional, un `null`
 * sí se valida: así responde 400 en lugar de llegar a la base (500 o un null guardado).
 */
export const Opcional = () =>
  ValidateIf((_objeto: object, valor: unknown) => valor !== undefined);

/**
 * Campo opcional que además se puede borrar mandando `null` (fecha de nacimiento, tarifa…):
 * el null no se valida y el servicio quita el dato.
 */
export const Borrable = () =>
  ValidateIf(
    (_objeto: object, valor: unknown) => valor !== undefined && valor !== null,
  );

/** Largo máximo en bytes (bcrypt solo usa los primeros 72 bytes, y una "ñ" ocupa 2). */
export const MaxBytes = (maximo: number, opciones?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'maxBytes',
      constraints: [maximo],
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' &&
          Buffer.byteLength(valor, 'utf8') <= maximo,
      },
    },
    opciones,
  );

// En la query string todo llega como texto, y axios manda "" para los filtros sin elegir:
// el texto vacío se trata como "sin filtro".
type Valor = { value: unknown };
const vacio = (valor: unknown) =>
  valor === undefined || valor === null || valor === '';

export const sinVacio = ({ value }: Valor) =>
  vacio(value) ? undefined : value;

export const aNumero = ({ value }: Valor) =>
  vacio(value) ? undefined : Number(value);

export const aBooleano = ({ value }: Valor) =>
  vacio(value)
    ? undefined
    : value === 'true'
      ? true
      : value === 'false'
        ? false
        : value;

export const recortar = ({ value }: Valor) =>
  typeof value === 'string' ? value.trim() : value;
