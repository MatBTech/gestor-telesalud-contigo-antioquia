// Interfaces que describen los datos que envia y recibe la API.
// Tiparlas permite que TypeScript avise si escribimos mal un campo,
// por ejemplo "atencion.nombrepaciente" en lugar de "nombrePaciente".

export type NombreRol = 'administrador' | 'coordinador' | 'medico_ebs';
export type EstadoKit = 'disponible' | 'asignado' | 'en_mantenimiento' | 'dado_de_baja';

// Usuario guardado en la sesion despues del login.
export interface UsuarioSesion {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: NombreRol;
}

export interface RespuestaLogin {
  accessToken: string;
  usuario: UsuarioSesion;
}

export interface Rol {
  id: number;
  nombre: NombreRol;
  descripcion: string | null;
}

export interface Usuario {
  id: number;
  nombreCompleto: string;
  correo: string;
  activo: boolean;
  rol: Rol;
  creadoEn: string;
}

export interface Municipio {
  id: number;
  nombre: string;
  subregion: string;
  latitud: number | null;
  longitud: number | null;
  origenCoordenadas: 'nominatim' | 'manual';
  totalAtenciones?: number;
  totalKits?: number;
}

export interface Coordenadas {
  latitud: number;
  longitud: number;
  nombreEncontrado: string;
  subregion: string | null;
}

export interface Archivo {
  id: number;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  subidoEn: string;
  subidoPorId: number | null;
}

export interface Atencion {
  id: number;
  nombrePaciente: string;
  especialidad: string;
  motivoConsulta: string;
  resueltoEnTerritorio: boolean;
  fechaAtencion: string;
  municipioId: number;
  municipio?: Municipio;
  archivos?: Archivo[];
  registradoPorId: number | null;
  registradoPor?: { id: number; nombreCompleto: string } | null;
}

// Datos que se envian para crear o editar una atencion.
export interface AtencionFormulario {
  nombrePaciente: string;
  especialidad: string;
  municipioId: number;
  motivoConsulta: string;
  resueltoEnTerritorio: boolean;
  fechaAtencion: string;
}

export interface FiltroAtenciones {
  municipioId?: number | null;
  especialidad?: string | null;
  resueltoEnTerritorio?: boolean | null;
  pagina: number;
  limite: number;
}

// Respuesta paginada del backend.
export interface Paginado<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
}

export interface Kit {
  id: number;
  codigo: string;
  descripcion: string | null;
  estado: EstadoKit;
  municipioId: number | null;
  municipio: Municipio | null;
  fechaAsignacion: string | null;
}

export interface Dashboard {
  resumen: {
    totalAtenciones: number;
    resueltasEnTerritorio: number;
    porcentajeResolucion: number;
    totalMunicipios: number;
    totalKits: number;
    kitsAsignados: number;
  };
  porSubregion: { subregion: string; total: number }[];
  porEspecialidad: { especialidad: string; total: number; resueltas: number }[];
  kitsPorEstado: { estado: EstadoKit; total: number }[];
  municipiosSinAtencion: { id: number; nombre: string; subregion: string; kitsAsignados: number }[];
}
