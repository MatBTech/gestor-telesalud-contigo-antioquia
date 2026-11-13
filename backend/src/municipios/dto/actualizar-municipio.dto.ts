import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { LIMITES_ANTIOQUIA, REGEX_NOMBRE, SUBREGIONES } from '../../common/constantes';
import { LimpiarTexto } from '../../common/transformadores';

// DTO para editar un municipio. Mismas reglas que al crear, pero todos los
// campos son opcionales.
export class ActualizarMunicipioDto {
  @IsOptional()
  @LimpiarTexto()
  @IsString({ message: 'El nombre debe ser texto.' })
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres.' })
  @Matches(REGEX_NOMBRE, { message: 'El nombre del municipio solo puede contener letras y espacios.' })
  nombre?: string;

  @IsOptional()
  @IsIn(SUBREGIONES, { message: 'Seleccione una subregión válida de Antioquia.' })
  subregion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'La latitud debe ser un número con máximo 6 decimales.' })
  @Min(LIMITES_ANTIOQUIA.latMin, { message: 'La latitud está fuera de Antioquia.' })
  @Max(LIMITES_ANTIOQUIA.latMax, { message: 'La latitud está fuera de Antioquia.' })
  latitud?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'La longitud debe ser un número con máximo 6 decimales.' })
  @Min(LIMITES_ANTIOQUIA.lonMin, { message: 'La longitud está fuera de Antioquia.' })
  @Max(LIMITES_ANTIOQUIA.lonMax, { message: 'La longitud está fuera de Antioquia.' })
  longitud?: number;
}
