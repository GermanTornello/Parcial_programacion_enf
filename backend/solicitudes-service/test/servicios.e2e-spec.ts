import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Servicios GraphQL (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;

  const gql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  const CREAR = `mutation ($input: CreateServicioInput!) {
    createServicio(input: $input) { id nombre duracionEstimadaMin precioReferencia activo }
  }`;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri('solicitudes_servicios_test');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  it('crea, busca, edita y borra un servicio', async () => {
    const creado = await gql(CREAR, {
      input: { nombre: 'Control de glucemia', duracionEstimadaMin: 15, precioReferencia: 5000 },
    }).expect(200);
    expect(creado.body.errors).toBeUndefined();
    const servicio = creado.body.data.createServicio;
    expect(servicio).toMatchObject({ nombre: 'Control de glucemia', activo: true });

    const lista = await gql(`{ servicios(search: "glucemia") { id nombre } }`).expect(200);
    expect(lista.body.data.servicios).toEqual([{ id: servicio.id, nombre: 'Control de glucemia' }]);

    const editado = await gql(
      `mutation ($id: ID!, $input: UpdateServicioInput!) { updateServicio(id: $id, input: $input) { precioReferencia activo } }`,
      { id: servicio.id, input: { precioReferencia: 5500, activo: false } },
    ).expect(200);
    expect(editado.body.data.updateServicio).toEqual({ precioReferencia: 5500, activo: false });

    const activos = await gql(`{ servicios(activo: true) { id } }`).expect(200);
    expect(activos.body.data.servicios).toEqual([]);

    const borrado = await gql(`mutation ($id: ID!) { removeServicio(id: $id) }`, { id: servicio.id }).expect(200);
    expect(borrado.body.data.removeServicio).toBe(true);

    const buscado = await gql(`query ($id: ID!) { servicio(id: $id) { id } }`, { id: servicio.id }).expect(200);
    expect(buscado.body.errors[0].message).toContain('No existe el servicio');
  });

  it('no permite dos servicios con el mismo nombre', async () => {
    const input = { nombre: 'Curación de heridas', duracionEstimadaMin: 30, precioReferencia: 9000 };
    await gql(CREAR, { input }).expect(200);

    const repetido = await gql(CREAR, { input: { ...input, nombre: 'curación de heridas' } }).expect(200);
    expect(repetido.body.data).toBeNull();
    expect(repetido.body.errors[0].message).toContain('Ya existe un servicio');
  });

  it('valida los datos de entrada (duración mínima de 5 minutos)', async () => {
    const invalido = await gql(CREAR, {
      input: { nombre: 'Servicio exprés', duracionEstimadaMin: 2, precioReferencia: 100 },
    }).expect(200);
    expect(invalido.body.errors).toBeDefined();
    expect(JSON.stringify(invalido.body.errors)).toContain('duracionEstimadaMin');
  });
});
