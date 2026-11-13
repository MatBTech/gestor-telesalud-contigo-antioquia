import { IsString, Length, Matches } from 'class-validator';
import { REGEX_NOMBRE } from '../../common/constantes';
import { LimpiarTexto } from '../../common/transformadores';

// DTO para que un usuario edite sus propios datos.
// Solo el nombre: el correo es su identidad y el rol lo asigna el
// administrador, por eso no se pueden cambiar desde "Mi perfil".
// Como el ValidationPipe usa forbidNonWhitelisted, si alguien intenta
// enviar "rol" o "activo" en este endpoint recibe un error 400.
export class ActualizarPerfilDto {
  @LimpiarTexto()
  @IsString({ message: 'El nombre debe ser texto.' })
  @Length(3, 120, { message: 'El nombre debe tener entre 3 y 120 caracteres.' })
  @Matches(REGEX_NOMBRE, { message: 'El nombre solo puede contener letras y espacios.' })
  nombreCompleto: string;
}
