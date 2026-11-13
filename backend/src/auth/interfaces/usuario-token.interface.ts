// Datos que se guardan dentro del token JWT (payload).
// Se guarda lo minimo: el id (sub), el correo y el rol.
// No se guardan datos sensibles porque el token solo esta codificado,
// no cifrado: cualquiera puede leer su contenido.
export interface PayloadJwt {
  sub: number;
  correo: string;
  rol: string;
}

// Objeto que JwtStrategy deja en request.user despues de validar el token.
// Los controladores lo reciben con el decorador @UsuarioActual().
export interface UsuarioToken {
  id: number;
  correo: string;
  nombreCompleto: string;
  rol: string;
}
