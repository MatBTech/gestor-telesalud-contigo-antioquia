import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsuarioToken } from '../interfaces/usuario-token.interface';

// Guard de autorizacion por roles.
// Debe ir DESPUES del JwtAuthGuard, porque necesita que request.user ya
// exista. Por eso en los controladores se usa @UseGuards(JwtAuthGuard, RolesGuard).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getAllAndOverride busca primero en el metodo y luego en la clase.
    // Asi un @Roles en un metodo puede reemplazar el que tiene el controlador.
    const rolesPermitidos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la ruta no tiene @Roles, basta con estar autenticado.
    if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

    const usuario = context.switchToHttp().getRequest().user as UsuarioToken;
    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tiene permisos para realizar esta acción.');
    }
    return true;
  }
}
