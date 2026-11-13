import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// Interceptor funcional que agrega el token JWT a cada peticion.
// Un interceptor se ejecuta en TODAS las peticiones de HttpClient, asi no
// hay que acordarse de poner la cabecera en cada servicio.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).obtenerToken();

  // Solo se envia el token a nuestra API. Si algun dia se consume otra API
  // externa, no se le debe entregar el token de nuestros usuarios.
  if (token && req.url.startsWith(environment.apiUrl)) {
    // Las peticiones son inmutables, por eso se clona con la cabecera nueva.
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
