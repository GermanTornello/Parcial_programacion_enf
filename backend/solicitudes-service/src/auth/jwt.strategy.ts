import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PayloadToken, UsuarioToken } from './rol.enum.js';

// Valida el token que emite usuarios-service: alcanza con conocer el mismo JWT_SECRET
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'supersecreto_tp_prog3'),
    });
  }

  validate(payload: PayloadToken): UsuarioToken {
    return { id: payload.sub, email: payload.email, rol: payload.rol, nombre: payload.nombre };
  }
}
