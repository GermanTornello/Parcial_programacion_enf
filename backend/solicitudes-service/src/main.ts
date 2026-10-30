import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permite que el frontend (otro puerto) consuma la API
  app.enableCors();

  // Valida los DTOs: descarta campos que no estén declarados y convierte tipos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('solicitudes-service')
    .setDescription(
      'Enfered: catálogo de servicios (GraphQL en /graphql), solicitudes de servicio y chat (REST)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  Logger.log(`solicitudes-service escuchando en el puerto ${port}`, 'Bootstrap');
}
await bootstrap();
