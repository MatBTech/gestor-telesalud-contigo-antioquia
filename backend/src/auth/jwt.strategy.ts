import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../entidades';
import { PayloadJwt, UsuarioToken } from './interfaces/usuario-token.interface';

// Estrategia JWT de Passport.
// Passport verifica la firma y la fecha de expiracion del token. Si todo esta
// bien, llama a validate() con el payload y lo que retorne queda en req.user.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>,
  ) {
    super({
      // El token viaja en la cabecera Authorization: Bearer <token>.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Ademas de confiar en el token, se consulta la base de datos para
  // confirmar que el usuario sigue existiendo y activo. Asi, si un
  // administrador desactiva a alguien, pierde el acceso de inmediato y no
  // cuando venza su token. El rol tambien se toma de la base de datos.
  async validate(payload: PayloadJwt): Promise<UsuarioToken> {
    const usuario = await this.usuariosRepo.findOne({ where: { id: payload.sub } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Su usuario no existe o fue desactivado.');
    }
    return {
      id: usuario.id,
      correo: usuario.correo,
      nombreCompleto: usuario.nombreCompleto,
      rol: usuario.rol.nombre,
    };
  }
}
