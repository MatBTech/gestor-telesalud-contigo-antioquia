import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificacion.service';

// Interceptor que maneja los errores generales de la API en un solo lugar.
// Los errores de validacion (400, 409, 422) NO se manejan aqui: los
// componentes los muestran junto al formulario, que es donde el usuario
// los puede corregir.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notificacion = inject(NotificacionService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const esLogin = req.url.endsWith('/auth/login');

      if (error.status === 0) {
        // Status 0: no hubo respuesta (backend apagado o sin internet).
        notificacion.error('No hay conexión con el servidor. Verifique su internet o que la API esté encendida.');
      } else if (error.status === 401 && !esLogin) {
        // Token vencido o usuario desactivado: se cierra la sesion.
        // En el login un 401 significa "credenciales incorrectas" y lo
        // muestra el propio formulario.
        notificacion.error('Su sesión expiró. Ingrese nuevamente.');
        auth.logout(true);
      } else if (error.status === 403) {
        notificacion.error('No tiene permisos para realizar esta acción.');
      } else if (error.status >= 500) {
        notificacion.error('Ocurrió un error en el servidor. Intente de nuevo en unos minutos.');
      }

      // Se vuelve a lanzar el error para que el componente tambien pueda
      // reaccionar (por ejemplo, quitar el indicador de carga).
      return throwError(() => error);
    }),
  );
};
