import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard que exige un token JWT valido.
// Extiende el AuthGuard('jwt') de Passport, que por debajo ejecuta la
// JwtStrategy. Se sobrescribe handleRequest solo para devolver el mensaje
// en espanol en lugar del "Unauthorized" que trae por defecto.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      throw err instanceof UnauthorizedException
        ? err
        : new UnauthorizedException('Su sesión no es válida o ya expiró. Inicie sesión nuevamente.');
    }
    return user;
  }
}
