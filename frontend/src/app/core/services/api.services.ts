import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificacionService } from './notificacion.service';
import {
  Archivo,
  Atencion,
  AtencionFormulario,
  Coordenadas,
  Dashboard,
  EstadoKit,
  FiltroAtenciones,
  Kit,
  Municipio,
  Paginado,
  Rol,
  Usuario,
} from '../models/modelos';

// Servicios que consumen la API. Cada clase agrupa los endpoints de un
// modulo del backend. Se dejan en un solo archivo porque son cortos y asi
// es facil ver todas las rutas que usa el frontend.
const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AtencionesService {
  private readonly http = inject(HttpClient);

  // HttpParams arma los query params (?municipioId=1&pagina=2) y solo
  // agrega los filtros que tienen valor.
  listar(filtro: FiltroAtenciones): Observable<Paginado<Atencion>> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('limite', filtro.limite);
    if (filtro.municipioId) params = params.set('municipioId', filtro.municipioId);
    if (filtro.especialidad) params = params.set('especialidad', filtro.especialidad);
    if (filtro.resueltoEnTerritorio !== null && filtro.resueltoEnTerritorio !== undefined) {
      params = params.set('resueltoEnTerritorio', String(filtro.resueltoEnTerritorio));
    }
    return this.http.get<Paginado<Atencion>>(`${API}/atenciones`, { params });
  }

  obtener(id: number): Observable<Atencion> {
    return this.http.get<Atencion>(`${API}/atenciones/${id}`);
  }

  crear(datos: AtencionFormulario): Observable<Atencion> {
    return this.http.post<Atencion>(`${API}/atenciones`, datos);
  }

  actualizar(id: number, datos: Partial<AtencionFormulario>): Observable<Atencion> {
    return this.http.patch<Atencion>(`${API}/atenciones/${id}`, datos);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${API}/atenciones/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ArchivosService {
  private readonly http = inject(HttpClient);
  private readonly notificacion = inject(NotificacionService);

  // Para enviar un archivo se usa FormData (multipart/form-data).
  // No se pone la cabecera Content-Type a mano: el navegador la arma sola
  // con el "boundary" que separa los campos.
  subir(atencionId: number, archivo: File): Observable<Archivo> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('atencionId', String(atencionId));
    return this.http.post<Archivo>(`${API}/archivos/upload`, formData);
  }

  // La descarga se pide como Blob porque el endpoint esta protegido con JWT:
  // un enlace <a href> normal no enviaria el token y el servidor lo rechazaria.
  descargar(archivo: Archivo): void {
    this.http
      .get(`${API}/archivos/download/${archivo.id}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          // Se crea una URL temporal en memoria y se simula el clic en un enlace.
          const url = URL.createObjectURL(blob);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = archivo.nombreOriginal;
          enlace.click();
          // Se libera la memoria de la URL temporal.
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        // Con responseType blob el mensaje de error tambien llega como Blob,
        // por eso se muestra un texto general (el 404 es el caso tipico).
        error: (err) => {
          if (err.status === 404) {
            this.notificacion.error('El archivo ya no está disponible en el servidor.');
          }
        },
      });
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${API}/archivos/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class MunicipiosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Municipio[]> {
    return this.http.get<Municipio[]>(`${API}/municipios`);
  }

  geocodificar(nombre: string): Observable<Coordenadas> {
    return this.http.get<Coordenadas>(`${API}/municipios/geocodificar`, { params: { nombre } });
  }

  crear(datos: { nombre: string; subregion: string; latitud?: number; longitud?: number }): Observable<Municipio> {
    return this.http.post<Municipio>(`${API}/municipios`, datos);
  }

  actualizar(id: number, datos: Partial<Municipio>): Observable<Municipio> {
    return this.http.patch<Municipio>(`${API}/municipios/${id}`, datos);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${API}/municipios/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class KitsService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Kit[]> {
    return this.http.get<Kit[]>(`${API}/kits`);
  }

  crear(datos: { codigo: string; descripcion?: string; municipioId?: number }): Observable<Kit> {
    return this.http.post<Kit>(`${API}/kits`, datos);
  }

  actualizar(id: number, datos: { codigo?: string; descripcion?: string }): Observable<Kit> {
    return this.http.patch<Kit>(`${API}/kits/${id}`, datos);
  }

  cambiarEstado(id: number, estado: EstadoKit, municipioId?: number): Observable<Kit> {
    return this.http.patch<Kit>(`${API}/kits/${id}/estado`, { estado, municipioId });
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${API}/kits/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${API}/dashboard`);
  }
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${API}/usuarios`);
  }

  listarRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${API}/usuarios/roles`);
  }

  // Se usa el endpoint de registro del modulo de autenticacion.
  registrar(datos: { nombreCompleto: string; correo: string; password: string; rol: string }): Observable<Usuario> {
    return this.http.post<Usuario>(`${API}/auth/register`, datos);
  }

  actualizar(
    id: number,
    datos: { nombreCompleto?: string; rol?: string; activo?: boolean; password?: string },
  ): Observable<Usuario> {
    return this.http.patch<Usuario>(`${API}/usuarios/${id}`, datos);
  }
}
