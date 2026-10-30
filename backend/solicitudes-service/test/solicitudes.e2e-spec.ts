import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { UsuariosClient } from './../src/solicitudes/usuarios.client.js';
import { ADMIN, ENFERMERA, JWT_SECRET_TEST, OTRA_ENFERMERA, OTRO_PACIENTE, PACIENTE } from './tokens.js';

const ENFERMERA_ID = '650000000000000000000c01'; // el mismo id que va dentro del token ENFERMERA
const enDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

describe('Solicitudes REST (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;
  let servicioId: string;

  // usuarios-service simulado: la enfermera existe, está aprobada y ofrece el servicio
  const usuariosSimulado = {
    buscarEnfermero: async () => ({
      id: ENFERMERA_ID,
      nombre: 'Laura',
      apellido: 'Gómez',
      estadoVerificacion: 'APROBADO',
      disponible: true,
      serviciosOfrecidos: [servicioId],
    }),
  };

  const http = () => request(app.getHttpServer());
  const como = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri('solicitudes_flujo_test');
    process.env.JWT_SECRET = JWT_SECRET_TEST;
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(UsuariosClient)
      .useValue(usuariosSimulado)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const creado = await http()
      .post('/graphql')
      .set(como(ADMIN))
      .send({ query: 'mutation { createServicio(input: { nombre: "Inyecciones", precioReferencia: 5000 }) { id } }' });
    servicioId = creado.body.data.createServicio.id;
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  it('flujo completo: el paciente pide, la enfermera acepta y la marca realizada', async () => {
    const pedido = { enfermeroId: ENFERMERA_ID, servicioId, fecha: enDias(5), hora: '10:00', direccionAtencion: 'San Martín 1234' };

    const creada = await http().post('/solicitudes').set(como(PACIENTE)).send(pedido).expect(201);
    expect(creada.body).toMatchObject({
      estado: 'PENDIENTE',
      pacienteNombre: 'Ana Pérez',
      enfermeroNombre: 'Laura Gómez',
      servicio: { id: servicioId, nombre: 'Inyecciones' },
    });
    expect(creada.body._id).toBeUndefined();
    const id = creada.body.id;

    const mias = await http().get('/solicitudes').set(como(PACIENTE)).expect(200);
    expect(mias.body.map((s: { id: string }) => s.id)).toEqual([id]);

    const recibidas = await http().get('/solicitudes?estado=PENDIENTE').set(como(ENFERMERA)).expect(200);
    expect(recibidas.body).toHaveLength(1);

    await http().get(`/solicitudes/${id}`).set(como(OTRO_PACIENTE)).expect(403);
    await http().patch(`/solicitudes/${id}/aceptar`).set(como(OTRA_ENFERMERA)).expect(403);
    await http().patch(`/solicitudes/${id}/realizar`).set(como(ENFERMERA)).expect(400);

    const aceptada = await http().patch(`/solicitudes/${id}/aceptar`).set(como(ENFERMERA)).expect(200);
    expect(aceptada.body.estado).toBe('ACEPTADA');

    const realizada = await http().patch(`/solicitudes/${id}/realizar`).set(como(ENFERMERA)).expect(200);
    expect(realizada.body.estado).toBe('REALIZADA');
  });

  it('no permite dos turnos de la enfermera en el mismo horario (409)', async () => {
    const pedido = { enfermeroId: ENFERMERA_ID, servicioId, fecha: enDias(9), hora: '16:30', direccionAtencion: 'Las Heras 50' };

    await http().post('/solicitudes').set(como(PACIENTE)).send(pedido).expect(201);
    const repetida = await http().post('/solicitudes').set(como(OTRO_PACIENTE)).send(pedido).expect(409);
    expect(repetida.body.message).toContain('ya tiene un turno en ese horario');
  });

  it('valida los datos y los roles', async () => {
    const malo = await http()
      .post('/solicitudes')
      .set(como(PACIENTE))
      .send({ enfermeroId: 'x', servicioId, fecha: '05/11/2026', hora: '25:00', direccionAtencion: '' })
      .expect(400);
    expect(malo.body.message).toEqual(
      expect.arrayContaining(['El enfermero no es válido', 'La fecha tiene que tener el formato AAAA-MM-DD']),
    );

    await http().post('/solicitudes').send({}).expect(401);
    await http().post('/solicitudes').set(como(ENFERMERA)).send({}).expect(403);
  });
});
