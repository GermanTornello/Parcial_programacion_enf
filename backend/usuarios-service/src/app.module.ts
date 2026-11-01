import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

/** LOGIN_LIMITE vacío, en cero o con texto no apaga ni bloquea el límite: vuelve a 5. */
export const limiteDeIntentos = (valor: string | undefined): number => {
  const limite = Number.parseInt(valor ?? '', 10);
  return Number.isInteger(limite) && limite > 0 ? limite : 5;
};

@Module({
  imports: [
    // Lee las variables del archivo .env y las deja disponibles en toda la app
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGO_URI',
          'mongodb://localhost:27017/usuarios_db',
        ),
      }),
    }),
    // Límite de intentos de login y registro: LOGIN_LIMITE por minuto y por IP (5 si no se indica)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: 60_000,
            limit: limiteDeIntentos(config.get<string>('LOGIN_LIMITE')),
          },
        ],
        errorMessage:
          'Hiciste demasiados intentos seguidos. Esperá un minuto y probá de nuevo',
      }),
    }),
    AuthModule,
    UsuariosModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
