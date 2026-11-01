import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    // Lee las variables del archivo .env y las deja disponibles en toda la app
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI', 'mongodb://localhost:27017/resenas_db'),
      }),
    }),
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
