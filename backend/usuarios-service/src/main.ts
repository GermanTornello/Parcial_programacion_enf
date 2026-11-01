import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('usuarios-service')
    .setDescription(
      'Enfered: registro y login (JWT), perfiles de paciente y enfermero, búsqueda de enfermeros por cercanía y validación de matrículas',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`usuarios-service escuchando en el puerto ${port}`, 'Bootstrap');
}
await bootstrap();
