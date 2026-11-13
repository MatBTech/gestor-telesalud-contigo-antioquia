import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard funcional: solo deja entrar a usuarios con sesion valida.
// Si no hay sesion, redirige al login y guarda en "returnUrl" la pagina que
// se intentaba abrir, para volver a ella despues de iniciar sesion.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.estaAutenticado()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Guard inverso para la pagina de login: si el usuario ya tiene sesion
// no tiene sentido mostrarle el formulario, se envia a su pagina de inicio.
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.estaAutenticado()) return true;
  return inject(Router).parseUrl(auth.rutaInicio());
};
