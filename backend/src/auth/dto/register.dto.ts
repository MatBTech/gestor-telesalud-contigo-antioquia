import { IsEmail, IsIn, IsString, Length, Matches, MaxLength } from 'class-validator';
import { LISTA_ROLES, REGEX_NOMBRE, REGEX_PASSWORD } from '../../common/constantes';
import { LimpiarCorreo, LimpiarTexto } from '../../common/transformadores';

// DTO para registrar un usuario nuevo.
// Cada regla tiene su mensaje en espanol para que el frontend lo pueda
// mostrar directamente debajo del campo.
export class RegisterDto {
  @LimpiarTexto()
  @IsString({ message: 'El nombre debe ser texto.' })
  @Length(3, 120, { message: 'El nombre debe tener entre 3 y 120 caracteres.' })
  @Matches(REGEX_NOMBRE, { message: 'El nombre solo puede contener letras y espacios.' })
  nombreCompleto: string;

  @LimpiarCorreo()
  @IsEmail({}, { message: 'Ingrese un correo electrónico válido.' })
  @MaxLength(120, { message: 'El correo no puede superar 120 caracteres.' })
  correo: string;

  // Contrasena con reglas minimas de seguridad.
  @IsString({ message: 'La contraseña debe ser texto.' })
  @Length(8, 64, { message: 'La contraseña debe tener entre 8 y 64 caracteres.' })
  @Matches(REGEX_PASSWORD, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número.',
  })
  password: string;

  // Se valida que sea uno de los roles conocidos. El servicio ademas
  // confirma que exista en la base de datos.
  @IsIn(LISTA_ROLES, { message: `El rol debe ser uno de: ${LISTA_ROLES.join(', ')}.` })
  rol: string;
}
