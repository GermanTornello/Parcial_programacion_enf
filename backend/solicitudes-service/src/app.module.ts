import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { ServiciosModule } from './servicios/servicios.module.js';

@Module({
  imports: [
    // Lee las variables del archivo .env y las deja disponibles en toda la app
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGO_URI',
          'mongodb://localhost:27017/solicitudes_db',
        ),
      }),
    }),
    // GraphQL code-first: el esquema se genera en memoria a partir de las clases
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      graphiql: true,
    }),
    ServiciosModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
