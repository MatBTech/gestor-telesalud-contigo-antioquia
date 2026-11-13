// Archivo "barril": reune todas las entidades para registrarlas en
// TypeORM con una sola importacion.
import { Rol } from './rol.entity';
import { Usuario } from './usuario.entity';
import { Municipio } from './municipio.entity';
import { Atencion } from './atencion.entity';
import { Kit } from './kit.entity';
import { Archivo } from './archivo.entity';

export { Rol, Usuario, Municipio, Atencion, Kit, Archivo };
export const ENTIDADES = [Rol, Usuario, Municipio, Atencion, Kit, Archivo];
