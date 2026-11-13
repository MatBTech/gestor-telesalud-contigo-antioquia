import { SetMetadata } from '@nestjs/common';
import { NombreRol } from '../../common/constantes';

// Llave con la que se guardan los roles en los metadatos de la ruta.
export const ROLES_KEY = 'roles';

// Decorador @Roles('administrador', 'coordinador').
// No hace la validacion por si mismo: solo "marca" la ruta con los roles
// permitidos. Quien revisa la marca y bloquea es el RolesGuard.
export const Roles = (...roles: NombreRol[]) => SetMetadata(ROLES_KEY, roles);
