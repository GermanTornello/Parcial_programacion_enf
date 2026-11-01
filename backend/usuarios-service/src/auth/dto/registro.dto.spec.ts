import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { limiteDeIntentos } from '../../app.module.js';
import { RegistroEnfermeroDto, RegistroPacienteDto } from './registro.dto.js';

// Validación al crear entidades: el ValidationPipe usa estas mismas reglas antes de llegar al servicio
const mensajes = async (clase: new () => object, datos: object) => {
  const errores = await validate(plainToInstance(clase, datos));
  return errores.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...(error.children ?? []).flatMap((hijo) =>
      Object.values(hijo.constraints ?? {}),
    ),
  ]);
};

const comunes = {
  nombre: 'Laura',
  apellido: 'Gómez',
  email: 'laura@correo.com',
  password: 'Secreta123',
  telefono: '2615551234',
  direccion: 'San Martín 1234',
};

const enfermeroValido = {
  ...comunes,
  matricula: 'MP-12345',
  departamento: 'Capital',
  serviciosOfrecidos: ['650000000000000000000001'],
  ubicacion: { lat: -32.8895, lng: -68.8458 },
};

describe('Validación al registrar', () => {
  it('acepta un enfermero con todos los datos obligatorios', async () => {
    expect(await mensajes(RegistroEnfermeroDto, enfermeroValido)).toEqual([]);
  });

  it('rechaza un enfermero sin matrícula', async () => {
    const { matricula: _matricula, ...sinMatricula } = enfermeroValido;

    expect(await mensajes(RegistroEnfermeroDto, sinMatricula)).toContain(
      'Ingresá tu matrícula',
    );
  });

  it('rechaza un departamento que no es de Mendoza y una ubicación inválida', async () => {
    const errores = await mensajes(RegistroEnfermeroDto, {
      ...enfermeroValido,
      departamento: 'Palermo',
      ubicacion: { lat: 200, lng: -68.8 },
    });

    expect(errores).toEqual(
      expect.arrayContaining([
        'Elegí un departamento de Mendoza',
        'La latitud no es válida',
      ]),
    );
  });

  it('rechaza un paciente con email inválido, contraseña corta y DNI con puntos', async () => {
    const errores = await mensajes(RegistroPacienteDto, {
      ...comunes,
      email: 'no-es-un-email',
      password: '123',
      dni: '30.111.222',
    });

    expect(errores).toEqual(
      expect.arrayContaining([
        'Ingresá un email válido',
        'La contraseña tiene que tener al menos 8 caracteres',
        'El DNI tiene que tener 7 u 8 números, sin puntos',
      ]),
    );
  });

  it('limita la contraseña en bytes, que es lo que usa bcrypt (una "ñ" ocupa 2)', async () => {
    expect(
      await mensajes(RegistroPacienteDto, {
        ...comunes,
        dni: '30111222',
        password: 'a'.repeat(72),
      }),
    ).toEqual([]);
    expect(
      await mensajes(RegistroPacienteDto, {
        ...comunes,
        dni: '30111222',
        password: 'ñ'.repeat(37),
      }),
    ).toContain('La contraseña es demasiado larga (máximo 72 caracteres)');
  });

  it('con las opciones de la app (stopAtFirstError) devuelve un solo mensaje claro por campo', async () => {
    const errores = await validate(
      plainToInstance(RegistroPacienteDto, { dni: '30111222' }),
      {
        stopAtFirstError: true,
      },
    );
    const porCampo = Object.fromEntries(
      errores.map((e) => [e.property, Object.values(e.constraints ?? {})]),
    );

    expect(porCampo).toEqual({
      nombre: ['Ingresá tu nombre'],
      apellido: ['Ingresá tu apellido'],
      email: ['Ingresá un email válido'],
      password: ['La contraseña tiene que tener al menos 8 caracteres'],
      telefono: ['Ingresá un teléfono válido'],
      direccion: ['Ingresá tu dirección'],
    });
  });

  it('un campo opcional en null no se saltea la validación', async () => {
    expect(
      await mensajes(RegistroEnfermeroDto, {
        ...enfermeroValido,
        aniosExperiencia: null,
      }),
    ).toContain('Los años de experiencia tienen que ser un número entero');
  });
});

describe('LOGIN_LIMITE', () => {
  it('un valor vacío, cero o con texto vuelve a 5 (no bloquea ni apaga el límite)', () => {
    expect([undefined, '', '0', '-3', 'abc'].map(limiteDeIntentos)).toEqual([
      5, 5, 5, 5, 5,
    ]);
    expect(limiteDeIntentos('10')).toBe(10);
  });
});
