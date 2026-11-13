import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ESTADOS_KIT } from '../../common/constantes';

// Filtros opcionales para el listado de kits.
export class FiltroKitsDto {
  @IsOptional()
  @IsIn(ESTADOS_KIT as unknown as string[], { message: 'El estado del filtro no es válido.' })
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  municipioId?: number;
}
