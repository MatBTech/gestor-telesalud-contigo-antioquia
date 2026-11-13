import { Transform } from 'class-transformer';
import { ValueTransformer } from 'typeorm';

// PostgreSQL devuelve las columnas DECIMAL como texto para no perder precision.
// Este transformador las convierte a number al leerlas, asi el frontend
// recibe 6.2518 y no el texto "6.251800".
export const transformadorDecimal: ValueTransformer = {
  to: (valor?: number | null) => valor,
  from: (valor?: string | null) =>
    valor === null || valor === undefined ? null : parseFloat(valor),
};

// Decorador para los DTO: quita espacios al inicio y al final y reemplaza
// espacios dobles por uno solo. Evita que se guarde "  Juan   Perez ".
export function LimpiarTexto() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  );
}

// Igual que LimpiarTexto pero ademas pasa a minusculas.
// Se usa en los correos para que "Admin@Correo.com" y "admin@correo.com"
// se consideren el mismo usuario.
export function LimpiarCorreo() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}

// Convierte "true"/"false" (que llegan como texto en formularios multipart
// o en query params) a booleanos reales.
export function ATextoBooleano() {
  return Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  });
}
