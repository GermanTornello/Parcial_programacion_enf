import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('devuelve el estado del servicio', () => {
    expect(appController.estado()).toEqual({
      servicio: 'vacunas-service',
      estado: 'ok',
    });
  });
});
