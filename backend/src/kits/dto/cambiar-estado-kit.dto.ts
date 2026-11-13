import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ESTADOS_KIT } from '../../common/constantes';
import type { EstadoKit } from '../../common/constantes';

// DTO para cambiar el estado de un kit.
// El municipio solo se exige cuando el nuevo estado es 'asignado'.
// Esa regla depende de otro campo, por eso se revisa en el servicio.
export class CambiarEstadoKitDto {
  @IsIn(ESTADOS_KIT as unknown as string[], {
    message: `El estado debe ser uno de: ${ESTADOS_KIT.join(', ')}.`,
  })
  estado: EstadoKit;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Seleccione un municipio válido.' })
  @Min(1, { message: 'Seleccione un municipio válido.' })
  municipioId?: number;
}
