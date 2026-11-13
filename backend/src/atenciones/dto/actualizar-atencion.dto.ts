import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { ESPECIALIDADES, REGEX_NOMBRE } from '../../common/constantes';
import { ATextoBooleano, LimpiarTexto } from '../../common/transformadores';

// DTO para editar una atencion. Mismas reglas que al crear, todas opcionales.
// Se escribe completo (sin PartialType) para que sea mas facil de leer.
export class ActualizarAtencionDto {
  @IsOptional()
  @LimpiarTexto()
  @IsString({ message: 'El nombre del paciente debe ser texto.' })
  @Length(3, 120, { message: 'El nombre del paciente debe tener entre 3 y 120 caracteres.' })
  @Matches(REGEX_NOMBRE, { message: 'El nombre del paciente solo puede contener letras y espacios.' })
  nombrePaciente?: string;

  @IsOptional()
  @IsIn(ESPECIALIDADES, { message: 'Seleccione una especialidad de la lista.' })
  especialidad?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Seleccione un municipio válido.' })
  @Min(1, { message: 'Seleccione un municipio válido.' })
  municipioId?: number;

  @IsOptional()
  @LimpiarTexto()
  @IsString({ message: 'El motivo de consulta debe ser texto.' })
  @Length(10, 1000, { message: 'El motivo de consulta debe tener entre 10 y 1000 caracteres.' })
  motivoConsulta?: string;

  @IsOptional()
  @ATextoBooleano()
  @IsBoolean({ message: 'Indique si la atención se resolvió en el territorio (sí o no).' })
  resueltoEnTerritorio?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de atención no tiene un formato válido.' })
  fechaAtencion?: string;
}
