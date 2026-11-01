import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarApp } from './../src/configurar-app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    // Base de datos en memoria: los tests no necesitan Mongo ni Docker
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri('resenas_test');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  it('GET / devuelve el estado del servicio', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ servicio: 'resenas-service', estado: 'ok' });
  });

  it('responde con las cabeceras de seguridad de helmet', async () => {
    const respuesta = await request(app.getHttpServer()).get('/').expect(200);
    expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    expect(respuesta.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(respuesta.headers['x-powered-by']).toBeUndefined();
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });
});
