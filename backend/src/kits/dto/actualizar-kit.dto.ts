import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { LimpiarTexto } from '../../common/transformadores';

// DTO para editar los datos basicos de un kit (codigo y descripcion).
// El estado y el municipio NO se cambian aqui: tienen su propio endpoint
// (PATCH /kits/:id/estado) porque llevan reglas de negocio propias.
export class ActualizarKitDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^KIT-\d{4}$/, { message: 'El código debe tener el formato KIT-0000 (por ejemplo KIT-0001).' })
  codigo?: string;

  // Se permite enviar texto vacio para borrar la descripcion.
  @IsOptional()
  @LimpiarTexto()
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(150, { message: 'La descripción no puede superar 150 caracteres.' })
  descripcion?: string;
}
