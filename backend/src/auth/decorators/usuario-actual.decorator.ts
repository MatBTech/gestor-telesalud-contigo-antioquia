import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioToken } from '../interfaces/usuario-token.interface';

// Decorador de parametro @UsuarioActual().
// Saca de la peticion el usuario que dejo la JwtStrategy, para no tener que
// escribir req.user en cada controlador.
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioToken => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UsuarioToken;
  },
);
