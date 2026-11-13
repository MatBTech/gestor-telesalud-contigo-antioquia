// Constantes del dominio en el frontend.
// Deben coincidir con las del backend (backend/src/common/constantes.ts).
// Se usan para llenar los select, asi el usuario elige de una lista y no
// puede escribir un valor que el servidor luego rechace.

import { EstadoKit, NombreRol } from './models/modelos';

export const SUBREGIONES = [
  'Bajo Cauca',
  'Magdalena Medio',
  'Nordeste',
  'Norte',
  'Occidente',
  'Oriente',
  'Suroeste',
  'Urabá',
  'Valle de Aburrá',
];

export const ESPECIALIDADES = [
  'Medicina interna',
  'Pediatría',
  'Ginecología y obstetricia',
  'Psiquiatría',
  'Psicología',
  'Dermatología',
  'Cardiología',
  'Neurología',
  'Medicina familiar',
  'Nutrición y dietética',
];

// Cada estado del kit con su texto amigable y la clase CSS de su color.
export const ESTADOS_KIT: { valor: EstadoKit; etiqueta: string; clase: string; icono: string }[] = [
  { valor: 'disponible', etiqueta: 'Disponible', clase: 'etiqueta-verde', icono: 'inventory_2' },
  { valor: 'asignado', etiqueta: 'Asignado', clase: 'etiqueta-azul', icono: 'satellite_alt' },
  { valor: 'en_mantenimiento', etiqueta: 'En mantenimiento', clase: 'etiqueta-amarilla', icono: 'build' },
  { valor: 'dado_de_baja', etiqueta: 'Dado de baja', clase: 'etiqueta-roja', icono: 'block' },
];

export const ROLES: { valor: NombreRol; etiqueta: string }[] = [
  { valor: 'administrador', etiqueta: 'Administrador' },
  { valor: 'coordinador', etiqueta: 'Coordinador' },
  { valor: 'medico_ebs', etiqueta: 'Médico EBS' },
];

// Limites aproximados de Antioquia para validar coordenadas manuales.
export const LIMITES_ANTIOQUIA = { latMin: 5.3, latMax: 9.0, lonMin: -77.3, lonMax: -73.8 };

// Letras (con tildes y enie), espacios, apostrofe, punto y guion.
export const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

// Minimo una minuscula, una mayuscula y un numero.
export const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

// Reglas de archivos: deben coincidir con las del backend.
export const ARCHIVOS = {
  extensiones: ['.pdf', '.jpg', '.jpeg', '.png'],
  tiposMime: ['application/pdf', 'image/jpeg', 'image/png'],
  tamanoMaximoBytes: 5 * 1024 * 1024,
  accept: '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png',
};

// Funciones de ayuda para mostrar textos amigables en las plantillas.
export function etiquetaEstadoKit(valor: string) {
  return ESTADOS_KIT.find((e) => e.valor === valor) ?? ESTADOS_KIT[0];
}

export function etiquetaRol(valor: string): string {
  return ROLES.find((r) => r.valor === valor)?.etiqueta ?? valor;
}

// Convierte bytes a un texto legible: 1536000 -> "1,5 MB".
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
