import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NombreRol, RespuestaLogin, UsuarioSesion } from '../models/modelos';

// Llaves con las que se guarda la sesion en el navegador.
const LLAVE_TOKEN = 'telesalud_token';
const LLAVE_USUARIO = 'telesalud_usuario';

// Servicio de autenticacion del frontend.
// Se guarda la sesion en sessionStorage (y no en localStorage) para que se
// cierre al cerrar la pestana. En los puntos de atencion rurales es comun
// que varias personas compartan el mismo computador.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Signal con el usuario actual. Los componentes que la leen (por ejemplo
  // el menu) se actualizan solos cuando cambia.
  private readonly usuarioActual = signal<UsuarioSesion | null>(this.leerUsuarioGuardado());
  readonly usuario = this.usuarioActual.asReadonly();
  readonly rol = computed(() => this.usuarioActual()?.rol ?? null);

  login(correo: string, password: string): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>(`${environment.apiUrl}/auth/login`, { correo, password })
      .pipe(
        // tap ejecuta una accion sin modificar la respuesta: guardar la sesion.
        tap((respuesta) => {
          sessionStorage.setItem(LLAVE_TOKEN, respuesta.accessToken);
          sessionStorage.setItem(LLAVE_USUARIO, JSON.stringify(respuesta.usuario));
          this.usuarioActual.set(respuesta.usuario);
        }),
      );
  }

  // "Mi perfil": el usuario cambia su propio nombre. Al guardar se actualiza
  // tambien la sesion para que la barra superior muestre el nombre nuevo.
  actualizarPerfil(nombreCompleto: string): Observable<UsuarioSesion> {
    return this.http.patch<UsuarioSesion>(`${environment.apiUrl}/auth/perfil`, { nombreCompleto }).pipe(
      tap((respuesta) => {
        const actual = this.usuarioActual();
        if (!actual) return;
        const nuevo = { ...actual, nombreCompleto: respuesta.nombreCompleto };
        sessionStorage.setItem(LLAVE_USUARIO, JSON.stringify(nuevo));
        this.usuarioActual.set(nuevo);
      }),
    );
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<{ mensaje: string }> {
    return this.http.patch<{ mensaje: string }>(`${environment.apiUrl}/auth/cambiar-password`, {
      passwordActual,
      passwordNueva,
    });
  }

  // Cierra la sesion. Si sesionExpirada es true se le avisa al usuario en
  // la pantalla de login por que tuvo que volver a ingresar.
  logout(sesionExpirada = false): void {
    sessionStorage.removeItem(LLAVE_TOKEN);
    sessionStorage.removeItem(LLAVE_USUARIO);
    this.usuarioActual.set(null);
    this.router.navigate(['/login'], sesionExpirada ? { queryParams: { expirada: 1 } } : {});
  }

  // Devuelve el token solo si existe y no ha vencido. Si ya vencio se borra,
  // asi no se envian peticiones que el servidor va a rechazar.
  obtenerToken(): string | null {
    const token = sessionStorage.getItem(LLAVE_TOKEN);
    if (!token) return null;
    if (this.tokenExpirado(token)) {
      sessionStorage.removeItem(LLAVE_TOKEN);
      sessionStorage.removeItem(LLAVE_USUARIO);
      this.usuarioActual.set(null);
      return null;
    }
    return token;
  }

  obtenerRol(): NombreRol | null {
    return this.obtenerToken() ? this.rol() : null;
  }

  estaAutenticado(): boolean {
    return this.obtenerToken() !== null;
  }

  tieneRol(...roles: NombreRol[]): boolean {
    const rol = this.obtenerRol();
    return rol !== null && roles.includes(rol);
  }

  // Pagina de inicio segun el rol: el medico entra directo a sus atenciones
  // porque no tiene acceso al dashboard.
  rutaInicio(): string {
    return this.obtenerRol() === 'medico_ebs' ? '/atenciones' : '/dashboard';
  }

  // El JWT tiene tres partes separadas por punto; la segunda (payload) es
  // JSON en base64url y trae el campo "exp" (segundos desde 1970).
  // Esta revision es solo para la experiencia de usuario: la validacion
  // real de la firma la hace el backend.
  private tokenExpirado(token: string): boolean {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as { exp?: number };
      return !payload.exp || payload.exp * 1000 <= Date.now();
    } catch {
      // Si el token no se puede leer se considera invalido.
      return true;
    }
  }

  private leerUsuarioGuardado(): UsuarioSesion | null {
    try {
      const texto = sessionStorage.getItem(LLAVE_USUARIO);
      return texto ? (JSON.parse(texto) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  }
}
