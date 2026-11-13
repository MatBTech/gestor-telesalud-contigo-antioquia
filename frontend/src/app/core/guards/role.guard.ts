import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NombreRol } from '../models/modelos';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificacion.service';

// Guard de roles. Los roles permitidos se definen en la propiedad "data"
// de cada ruta, por ejemplo: data: { roles: ['administrador'] }.
// Importante: esto solo oculta pantallas. La seguridad real esta en el
// backend (RolesGuard), porque el codigo del frontend se puede modificar
// desde el navegador.
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const roles = (route.data['roles'] ?? []) as NombreRol[];

  if (roles.length === 0 || auth.tieneRol(...roles)) return true;

  inject(NotificacionService).error('No tiene permisos para ver esa sección.');
  return inject(Router).parseUrl(auth.rutaInicio());
};
