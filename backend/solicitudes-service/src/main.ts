import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Logging, helmet, CORS y validación (lo mismo que usan los tests e2e)
  configurarApp(app);

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
