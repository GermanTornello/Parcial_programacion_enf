import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarApp } from './../src/configurar-app.js';

const CURACIONES = '650000000000000000000001';
const INYECCIONES = '650000000000000000000002';
const INTENSIVOS = '650000000000000000000006';
const CAPITAL = { lat: -32.8895, lng: -68.8458 };

let mongo: MongoMemoryServer;

/** Levanta una app real contra su propia base en memoria (cada describe tiene la suya). */
async function crearApp(base: string, env: Record<string, string>) {
  Object.assign(process.env, {
    MONGO_URI: mongo.getUri(base),
    JWT_SECRET: 'secreto_de_los_tests',
    ...env,
  });
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configurarApp(app);
  await app.init(); // al iniciar corre el seed (si SEED_USUARIOS no es false)
  return app;
}

const como = (token: string) => ({ Authorization: `Bearer ${token}` });

let contador = 0;
/** Datos de un paciente nuevo y único, para que cada test cree lo suyo. */
const nuevoPaciente = (extra: Record<string, unknown> = {}) => {
  contador += 1;
  return {
    nombre: 'Beto',
    apellido: `Gómez${contador}`,
    email: `paciente${contador}@correo.com`,
    password: 'Secreta123',
    telefono: '2615550001',
    direccion: 'Colón 100',
    dni: String(35000000 + contador),
    ...extra,
  };
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
});

afterAll(async () => {
  await mongo.stop();
});

describe('usuarios-service (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const login = async (email: string, password: string) =>
    (await http().post('/auth/login').send({ email, password }).expect(200))
      .body.access_token as string;
  const registrarYEntrar = async (datos = nuevoPaciente()) => {
    const { body } = await http()
      .post('/auth/register/paciente')
      .send(datos)
      .expect(201);
    return { usuario: body, token: await login(datos.email, datos.password) };
  };

  beforeAll(async () => {
    // Límite alto: acá no se prueba el throttler (tiene su propio describe más abajo)
    app = await crearApp('usuarios_e2e', {
      LOGIN_LIMITE: '1000',
      SEED_USUARIOS: 'true',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / responde el estado del servicio', async () => {
    await http()
      .get('/')
      .expect(200, { servicio: 'usuarios-service', estado: 'ok' });
  });

  it('registro de paciente → login → con el token ve y edita su perfil', async () => {
    const paciente = nuevoPaciente();

    const registrado = await http()
      .post('/auth/register/paciente')
      .send(paciente)
      .expect(201);
    expect(registrado.body).toMatchObject({
      nombre: 'Beto',
      email: paciente.email,
      rol: 'PACIENTE',
    });
    expect(registrado.body.id).toEqual(expect.any(String));
    expect(registrado.body._id).toBeUndefined();
    expect(registrado.body.password).toBeUndefined();

    // email repetido (aunque cambie mayúsculas) → 409
    const repetido = await http()
      .post('/auth/register/paciente')
      .send({
        ...paciente,
        email: paciente.email.toUpperCase(),
        dni: '39999999',
      })
      .expect(409);
    expect(repetido.body.message).toBe('El email ya está registrado');

    const loginMalo = await http()
      .post('/auth/login')
      .send({ email: paciente.email, password: 'otra-clave' })
      .expect(401);
    expect(loginMalo.body.message).toBe(
      'El email o la contraseña no son correctos',
    );

    const respuesta = await http()
      .post('/auth/login')
      .send({ email: paciente.email, password: paciente.password })
      .expect(200);
    expect(respuesta.body.user).toEqual({
      id: registrado.body.id,
      nombre: 'Beto',
      apellido: paciente.apellido,
      email: paciente.email,
      rol: 'PACIENTE',
    });
    const token = respuesta.body.access_token;

    const me = await http().get('/auth/me').set(como(token)).expect(200);
    expect(me.body).toMatchObject({
      id: registrado.body.id,
      dni: paciente.dni,
    });

    // rol y email se descartan: no se pueden cambiar desde el perfil
    const editado = await http()
      .patch('/perfil')
      .set(como(token))
      .send({ obraSocial: 'OSEP', rol: 'ADMIN', email: 'otro@correo.com' })
      .expect(200);
    expect(editado.body).toMatchObject({
      obraSocial: 'OSEP',
      rol: 'PACIENTE',
      email: paciente.email,
    });

    // null no llega a la base: 400 (y no 500)
    const conNull = await http()
      .patch('/perfil')
      .set(como(token))
      .send({ nombre: null })
      .expect(400);
    expect(conNull.body.message).toEqual(['El nombre no puede quedar vacío']);

    await http().get('/auth/me').expect(401);
  });

  it('registro de enfermero → login → carga sus servicios y horarios → el admin lo aprueba y aparece en la búsqueda', async () => {
    const registrado = await http()
      .post('/auth/register/enfermero')
      .send({
        nombre: 'Marta',
        apellido: 'Díaz',
        email: 'marta@correo.com',
        password: 'Secreta123',
        telefono: '2615550002',
        direccion: 'Belgrano 200',
        matricula: 'MP-20001',
        departamento: 'Maipú',
        especialidades: ['Pediatría'],
        serviciosOfrecidos: [INYECCIONES, INYECCIONES],
        ubicacion: { lat: -32.9832, lng: -68.7851 },
      })
      .expect(201);
    expect(registrado.body).toMatchObject({
      estadoVerificacion: 'PENDIENTE',
      aniosExperiencia: 0,
      serviciosOfrecidos: [INYECCIONES],
    });
    const id = registrado.body.id;

    // Con su token, la enfermera carga lo que ofrece (los repetidos se guardan una sola vez)
    const token = await login('marta@correo.com', 'Secreta123');
    const perfil = await http()
      .patch('/perfil')
      .set(como(token))
      .send({
        serviciosOfrecidos: [INYECCIONES, CURACIONES, INYECCIONES],
        disponibilidad: [{ dia: 1, desde: '09:00', hasta: '13:00' }],
      })
      .expect(200);
    expect(perfil.body.serviciosOfrecidos).toEqual([INYECCIONES, CURACIONES]);
    expect(perfil.body.disponibilidad).toEqual([
      { dia: 1, desde: '09:00', hasta: '13:00' },
    ]);

    const buscar = () =>
      http()
        .get('/enfermeros/buscar')
        .query({ lat: -32.98, lng: -68.78, radioKm: 5 })
        .expect(200);
    expect((await buscar()).body).toEqual([]); // PENDIENTE: no aparece

    const tokenAdmin = await login('admin@enfered.com', 'Admin123!');
    const pendientes = await http()
      .get('/admin/enfermeros?estado=PENDIENTE')
      .set(como(tokenAdmin))
      .expect(200);
    expect(pendientes.body.map((e: { id: string }) => e.id)).toEqual([id]);

    // Rechazar sin motivo o con un motivo hecho de espacios → 400 con el mensaje correcto
    for (const motivo of [undefined, null, '            ']) {
      const sinMotivo = await http()
        .patch(`/admin/enfermeros/${id}/verificacion`)
        .set(como(tokenAdmin))
        .send({ estado: 'RECHAZADO', motivo })
        .expect(400);
      expect(sinMotivo.body.message[0]).toContain(
        'Escribí el motivo del rechazo',
      );
    }

    // Al aprobar, el motivo se ignora (el front puede mandarlo vacío)
    const aprobado = await http()
      .patch(`/admin/enfermeros/${id}/verificacion`)
      .set(como(tokenAdmin))
      .send({ estado: 'APROBADO', motivo: '' })
      .expect(200);
    expect(aprobado.body.estadoVerificacion).toBe('APROBADO');

    const encontrados = (await buscar()).body;
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]).toMatchObject({
      id,
      nombre: 'Marta',
      departamento: 'Maipú',
    });
    expect(encontrados[0].distanciaKm).toBeLessThan(1);
    for (const privado of ['email', 'password', 'direccion', 'motivoRechazo']) {
      expect(encontrados[0][privado]).toBeUndefined();
    }

    // Perfil público: lo que consulta solicitudes-service antes de crear una solicitud
    const publico = await http().get(`/enfermeros/${id}`).expect(200);
    expect(publico.body).toMatchObject({
      id,
      nombre: 'Marta',
      apellido: 'Díaz',
      estadoVerificacion: 'APROBADO',
      disponible: true,
      serviciosOfrecidos: [INYECCIONES, CURACIONES],
    });
    expect(publico.body.email).toBeUndefined();
    expect(publico.body.direccion).toBeUndefined();
    await http().get('/enfermeros/650000000000000000000099').expect(404);
    await http().get('/enfermeros/no-es-un-id').expect(404);
  });

  it('valida el registro con un mensaje por campo', async () => {
    const sinMatricula = await http()
      .post('/auth/register/enfermero')
      .send({
        nombre: 'Sin',
        apellido: 'Matrícula',
        email: 'sinmatricula@correo.com',
        password: 'Secreta123',
        telefono: '2615550003',
        direccion: 'Mitre 1',
        departamento: 'Capital',
        ubicacion: CAPITAL,
      })
      .expect(400);
    expect(sinMatricula.body.message).toEqual(['Ingresá tu matrícula']);

    // aniosExperiencia: null no saltea la validación (si no, se guardaría null en vez de 0)
    const conNull = await http()
      .post('/auth/register/paciente')
      .send(nuevoPaciente({ obraSocial: null }))
      .expect(400);
    expect(conNull.body.message).toEqual(['obraSocial tiene que ser un texto']);

    // bcrypt solo usa 72 bytes: 72 "ñ" son 144 bytes
    await http()
      .post('/auth/register/paciente')
      .send(nuevoPaciente({ password: 'ñ'.repeat(72) }))
      .expect(400);
  });

  it('solo el ADMIN entra al panel: 401 sin token y 403 para paciente y enfermero', async () => {
    const { token: tokenPaciente } = await registrarYEntrar();
    const tokenEnfermero = await login(
      'enfermero1@enfered.com',
      'Enfermero123!',
    );

    await http().get('/admin/usuarios').expect(401);
    await http().get('/admin/usuarios').set(como(tokenPaciente)).expect(403);
    await http().get('/admin/enfermeros').set(como(tokenEnfermero)).expect(403);
    const prohibido = await http()
      .delete('/admin/usuarios/650000000000000000000099')
      .set(como(tokenPaciente))
      .expect(403);
    expect(prohibido.body.message).toBe('No tenés permiso para hacer esto');
  });

  it('la búsqueda ordena por distancia y filtra por servicio y departamento', async () => {
    const cerca = await http()
      .get('/enfermeros/buscar')
      .query({ ...CAPITAL, radioKm: 10 })
      .expect(200);
    const distancias = cerca.body.map(
      (e: { distanciaKm: number }) => e.distanciaKm,
    );
    expect(cerca.body[0].nombre).toBe('Laura'); // la enfermera de prueba está en Capital
    expect(distancias).toEqual([...distancias].sort((a, b) => a - b));
    // Luján de Cuyo está a más de 10 km de Capital
    expect(
      cerca.body.map((e: { departamento: string }) => e.departamento),
    ).not.toContain('Luján de Cuyo');

    const intensivos = await http()
      .get('/enfermeros/buscar')
      .query({ ...CAPITAL, radioKm: 50, servicioId: INTENSIVOS })
      .expect(200);
    expect(intensivos.body.map((e: { nombre: string }) => e.nombre)).toEqual([
      'Diego',
    ]);

    const enGodoyCruz = await http()
      .get('/enfermeros/buscar')
      .query({
        ...CAPITAL,
        radioKm: 50,
        departamento: 'Godoy Cruz',
        especialidad: 'pediatría',
      })
      .expect(200);
    expect(enGodoyCruz.body.map((e: { nombre: string }) => e.nombre)).toEqual([
      'Martín',
    ]);

    // Así manda axios un formulario con los filtros sin elegir: no tiene que fallar
    const filtrosVacios = await http()
      .get(
        '/enfermeros/buscar?lat=&lng=&radioKm=&especialidad=&servicioId=&departamento=&disponible=',
      )
      .expect(200);
    expect(filtrosVacios.body.length).toBeGreaterThan(0);

    const soloLat = await http()
      .get('/enfermeros/buscar')
      .query({ lat: -34.6 })
      .expect(400);
    expect(soloLat.body.message).toEqual([
      'Mandá la latitud y la longitud juntas',
    ]);
    await http()
      .get('/enfermeros/buscar')
      .query({ lat: 500, lng: -68 })
      .expect(400);
  });

  it('el admin busca y borra usuarios', async () => {
    const tokenAdmin = await login('admin@enfered.com', 'Admin123!');
    const datos = nuevoPaciente({ nombre: 'Rosa', apellido: 'Paz' });
    await http().post('/auth/register/paciente').send(datos).expect(201);

    const encontrados = await http()
      .get('/admin/usuarios')
      .query({ search: 'rosa paz', rol: '' })
      .set(como(tokenAdmin))
      .expect(200);
    expect(encontrados.body.map((u: { email: string }) => u.email)).toEqual([
      datos.email,
    ]);
    const rosa = encontrados.body[0];

    await http()
      .delete(`/admin/usuarios/${rosa.id}`)
      .set(como(tokenAdmin))
      .expect(204);
    await http()
      .delete(`/admin/usuarios/${rosa.id}`)
      .set(como(tokenAdmin))
      .expect(404);
  });
});

describe('límite de intentos del login (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // App propia con su propio contador, para no depender de los logins de otros tests
    app = await crearApp('usuarios_e2e_throttler', {
      LOGIN_LIMITE: '3',
      SEED_USUARIOS: 'false',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deja pasar 3 intentos por minuto y al cuarto responde 429', async () => {
    const http = () => request(app.getHttpServer());
    const datos = nuevoPaciente();
    await http().post('/auth/register/paciente').send(datos).expect(201);

    for (let intento = 1; intento <= 3; intento++) {
      await http()
        .post('/auth/login')
        .send({ email: datos.email, password: 'mala-clave' })
        .expect(401);
    }
    // Ni con la contraseña correcta: hay que esperar el minuto
    const bloqueado = await http()
      .post('/auth/login')
      .send({ email: datos.email, password: datos.password })
      .expect(429);
    expect(bloqueado.body.message).toBe(
      'Hiciste demasiados intentos seguidos. Esperá un minuto y probá de nuevo',
    );
  });
});
