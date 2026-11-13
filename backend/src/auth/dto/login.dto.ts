import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LimpiarCorreo } from '../../common/transformadores';

// DTO del inicio de sesion.
// En el login no se valida el formato de la contrasena (longitud, mayusculas)
// a proposito: solo se compara con la guardada. Si diera pistas sobre las
// reglas, se le facilitaria el trabajo a un atacante.
export class LoginDto {
  @LimpiarCorreo()
  @IsEmail({}, { message: 'Ingrese un correo electrónico válido.' })
  @MaxLength(120, { message: 'El correo no puede superar 120 caracteres.' })
  correo: string;

  @IsString({ message: 'La contraseña debe ser texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MaxLength(64, { message: 'La contraseña no puede superar 64 caracteres.' })
  password: string;
}
