import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { LISTA_ROLES, REGEX_NOMBRE, REGEX_PASSWORD } from '../../common/constantes';
import { LimpiarTexto } from '../../common/transformadores';

// DTO para editar un usuario. Todos los campos son opcionales porque se
// puede cambiar solo uno (por ejemplo, solo activar o desactivar).
// El correo no se puede cambiar porque es la identidad del usuario.
export class ActualizarUsuarioDto {
  @IsOptional()
  @LimpiarTexto()
  @IsString({ message: 'El nombre debe ser texto.' })
  @Length(3, 120, { message: 'El nombre debe tener entre 3 y 120 caracteres.' })
  @Matches(REGEX_NOMBRE, { message: 'El nombre solo puede contener letras y espacios.' })
  nombreCompleto?: string;

  @IsOptional()
  @IsIn(LISTA_ROLES, { message: `El rol debe ser uno de: ${LISTA_ROLES.join(', ')}.` })
  rol?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser verdadero o falso.' })
  activo?: boolean;

  // Permite que el administrador restablezca la contrasena.
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto.' })
  @Length(8, 64, { message: 'La contraseña debe tener entre 8 y 64 caracteres.' })
  @Matches(REGEX_PASSWORD, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número.',
  })
  password?: string;
}
