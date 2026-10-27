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
    .setTitle('vacunas-service')
    .setDescription(
      'Catálogo de vacunas (GraphQL en /graphql) y registro de aplicaciones (REST)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  Logger.log(`vacunas-service escuchando en el puerto ${port}`, 'Bootstrap');
}
await bootstrap();
