import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';
import { REGEX_PASSWORD } from '../../common/constantes';

// DTO para que el usuario cambie su propia contrasena.
// Se exige la contrasena actual: si alguien deja la sesion abierta en un
// computador compartido, otra persona no puede cambiarla sin conocerla.
export class CambiarPasswordDto {
  @IsString({ message: 'La contraseña actual debe ser texto.' })
  @IsNotEmpty({ message: 'Ingrese su contraseña actual.' })
  @MaxLength(64, { message: 'La contraseña actual no puede superar 64 caracteres.' })
  passwordActual: string;

  @IsString({ message: 'La contraseña nueva debe ser texto.' })
  @Length(8, 64, { message: 'La contraseña nueva debe tener entre 8 y 64 caracteres.' })
  @Matches(REGEX_PASSWORD, {
    message: 'La contraseña nueva debe tener al menos una mayúscula, una minúscula y un número.',
  })
  passwordNueva: string;
}
