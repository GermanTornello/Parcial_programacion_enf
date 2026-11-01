import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarApp } from './../src/configurar-app.js';
import { SolicitudesClient } from './../src/resenas/solicitudes.client.js';
import { ADMIN, ENFERMERA, JWT_SECRET_TEST, OTRO_PACIENTE, PACIENTE } from './tokens.js';

const PACIENTE_ID = '650000000000000000000b01'; // los mismos ids que van dentro de los tokens
const ENFERMERA_ID = '650000000000000000000c01';
const REALIZADA = '650000000000000000000d01';
const REALIZADA_2 = '650000000000000000000d02';
const ACEPTADA = '650000000000000000000d03';

describe('Reseñas GraphQL (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;

  // solicitudes-service simulado
  const solicitudes: Record<string, { estado: string }> = {
    [REALIZADA]: { estado: 'REALIZADA' },
    [REALIZADA_2]: { estado: 'REALIZADA' },
    [ACEPTADA]: { estado: 'ACEPTADA' },
  };
  const solicitudesSimulado = {
    obtener: async (id: string) => ({ id, pacienteId: PACIENTE_ID, enfermeroId: ENFERMERA_ID, ...solicitudes[id] }),
  };

  const gql = (query: string, variables?: Record<string, unknown>, token?: string) => {
    const pedido = request(app.getHttpServer()).post('/graphql');
    if (token) pedido.set('Authorization', `Bearer ${token}`);
    return pedido.send({ query, variables });
  };
  const CALIFICAR = `mutation ($input: CreateResenaInput!) {
    createResena(input: $input) { id solicitudId enfermeroId pacienteNombre puntuacion comentario createdAt }
  }`;
  const primerError = (respuesta: request.Response) => respuesta.body.errors?.[0]?.message;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri('resenas_e2e_test');
    process.env.JWT_SECRET = JWT_SECRET_TEST;
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SolicitudesClient)
      .useValue(solicitudesSimulado)
      .compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  it('el paciente califica un servicio realizado y se actualiza la reputación del enfermero', async () => {
    const creada = await gql(CALIFICAR, { input: { solicitudId: REALIZADA, puntuacion: 5, comentario: 'Excelente' } }, PACIENTE);
    expect(creada.body.errors).toBeUndefined();
    expect(creada.body.data.createResena).toMatchObject({
      solicitudId: REALIZADA,
      enfermeroId: ENFERMERA_ID,
      pacienteNombre: 'Ana Pérez',
      puntuacion: 5,
    });

    await gql(CALIFICAR, { input: { solicitudId: REALIZADA_2, puntuacion: 4 } }, PACIENTE);

    const reputacion = await gql(`{ reputacion(enfermeroId: "${ENFERMERA_ID}") { promedio cantidad } }`);
    expect(reputacion.body.data.reputacion).toEqual({ promedio: 4.5, cantidad: 2 });

    const lista = await gql(`{ reputaciones(enfermeroIds: ["${ENFERMERA_ID}", "sin-resenas"]) { enfermeroId promedio cantidad } }`);
    expect(lista.body.data.reputaciones).toEqual([
      { enfermeroId: ENFERMERA_ID, promedio: 4.5, cantidad: 2 },
      { enfermeroId: 'sin-resenas', promedio: 0, cantidad: 0 },
    ]);

    const publicas = await gql(`{ resenas(enfermeroId: "${ENFERMERA_ID}") { puntuacion } }`);
    expect(publicas.body.data.resenas.map((r: { puntuacion: number }) => r.puntuacion)).toEqual([4, 5]);

    const mias = await gql(`{ misResenas { solicitudId } }`, undefined, PACIENTE);
    expect(mias.body.data.misResenas).toHaveLength(2);
  });

  it('aplica las reglas: no realizada, dos veces, sin login y rol equivocado', async () => {
    const noRealizada = await gql(CALIFICAR, { input: { solicitudId: ACEPTADA, puntuacion: 3 } }, PACIENTE);
    expect(primerError(noRealizada)).toBe('Solo podés calificar un servicio que ya se realizó');

    const repetida = await gql(CALIFICAR, { input: { solicitudId: REALIZADA, puntuacion: 1 } }, PACIENTE);
    expect(primerError(repetida)).toBe('Ya calificaste este servicio');

    const sinLogin = await gql(CALIFICAR, { input: { solicitudId: REALIZADA, puntuacion: 1 } });
    expect(primerError(sinLogin)).toBe('Tenés que iniciar sesión');

    const comoEnfermera = await gql(CALIFICAR, { input: { solicitudId: REALIZADA, puntuacion: 1 } }, ENFERMERA);
    expect(primerError(comoEnfermera)).toBe('No tenés permiso para hacer esto');

    const fueraDeRango = await gql(CALIFICAR, { input: { solicitudId: REALIZADA, puntuacion: 9 } }, PACIENTE);
    expect(JSON.stringify(fueraDeRango.body.errors)).toContain('La puntuación va de 1 a 5 estrellas');
  });

  it('solo el autor edita; el autor o un ADMIN pueden borrar', async () => {
    const { body } = await gql(`{ misResenas { id solicitudId } }`, undefined, PACIENTE);
    const id = body.data.misResenas.find((r: { solicitudId: string }) => r.solicitudId === REALIZADA_2).id;
    const EDITAR = `mutation ($id: ID!, $input: UpdateResenaInput!) { updateResena(id: $id, input: $input) { puntuacion comentario } }`;

    const ajena = await gql(EDITAR, { id, input: { puntuacion: 1 } }, OTRO_PACIENTE);
    expect(primerError(ajena)).toBe('Solo quien escribió la reseña puede editarla');

    const propia = await gql(EDITAR, { id, input: { puntuacion: 3, comentario: 'Llegó un poco tarde' } }, PACIENTE);
    expect(propia.body.data.updateResena).toEqual({ puntuacion: 3, comentario: 'Llegó un poco tarde' });

    const borrada = await gql(`mutation ($id: ID!) { removeResena(id: $id) }`, { id }, ADMIN);
    expect(borrada.body.data.removeResena).toBe(true);

    const reputacion = await gql(`{ reputacion(enfermeroId: "${ENFERMERA_ID}") { promedio cantidad } }`);
    expect(reputacion.body.data.reputacion).toEqual({ promedio: 5, cantidad: 1 });
  });
});
