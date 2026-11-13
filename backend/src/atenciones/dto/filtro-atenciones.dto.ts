import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ESPECIALIDADES } from '../../common/constantes';
import { ATextoBooleano } from '../../common/transformadores';

// DTO para los parametros de busqueda (query params) del listado.
// Ejemplo: GET /api/atenciones?municipioId=3&especialidad=Pediatría&pagina=2
// Los query params siempre llegan como texto, por eso se usa @Type(() => Number).
export class FiltroAtencionesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El municipio del filtro no es válido.' })
  @Min(1)
  municipioId?: number;

  @IsOptional()
  @IsIn(ESPECIALIDADES, { message: 'La especialidad del filtro no es válida.' })
  especialidad?: string;

  @IsOptional()
  @ATextoBooleano()
  @IsBoolean({ message: 'El filtro de resolución debe ser true o false.' })
  resueltoEnTerritorio?: boolean;

  // Paginacion en el servidor: se traen solo las filas de la pagina actual
  // en lugar de toda la tabla, asi el sistema sigue siendo rapido cuando
  // haya miles de atenciones.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La página debe ser mayor o igual a 1.' })
  pagina: number = 1;

  // Maximo 100 por pagina para que nadie pida la tabla completa de una vez.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Se pueden pedir máximo 100 registros por página.' })
  limite: number = 10;
}
