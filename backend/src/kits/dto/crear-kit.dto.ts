import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { LimpiarTexto } from '../../common/transformadores';

// DTO para registrar un kit en el inventario.
export class CrearKitDto {
  // El codigo se pasa a mayusculas para que "kit-0001" y "KIT-0001" sean
  // el mismo. El formato fijo facilita buscar los kits en bodega.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^KIT-\d{4}$/, { message: 'El código debe tener el formato KIT-0000 (por ejemplo KIT-0001).' })
  codigo: string;

  @IsOptional()
  @LimpiarTexto()
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(150, { message: 'La descripción no puede superar 150 caracteres.' })
  descripcion?: string;

  // Si se envia un municipio, el kit queda creado directamente como 'asignado'.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Seleccione un municipio válido.' })
  @Min(1, { message: 'Seleccione un municipio válido.' })
  municipioId?: number;
}
