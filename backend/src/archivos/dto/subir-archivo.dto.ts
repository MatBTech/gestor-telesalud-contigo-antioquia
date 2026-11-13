import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// DTO del campo de texto que acompana al archivo en el formulario.
// En multipart/form-data todo llega como texto, por eso @Type(() => Number).
export class SubirArchivoDto {
  @Type(() => Number)
  @IsInt({ message: 'Debe indicar a qué atención pertenece el archivo.' })
  @Min(1, { message: 'Debe indicar a qué atención pertenece el archivo.' })
  atencionId: number;
}
