import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { LIMITES_ANTIOQUIA, REGEX_NOMBRE, SUBREGIONES } from '../../common/constantes';
import { LimpiarTexto } from '../../common/transformadores';

// DTO para crear un municipio.
// Las coordenadas son opcionales: si no se envian se consultan en Nominatim.
// Si se envian, se toman como ingreso manual.
export class CrearMunicipioDto {
  @LimpiarTexto()
  @IsString({ message: 'El nombre debe ser texto.' })
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres.' })
  @Matches(REGEX_NOMBRE, { message: 'El nombre del municipio solo puede contener letras y espacios.' })
  nombre: string;

  @IsIn(SUBREGIONES, { message: 'Seleccione una subregión válida de Antioquia.' })
  subregion: string;

  // Los limites de Min y Max evitan coordenadas fuera del departamento,
  // por ejemplo si alguien invierte latitud y longitud por error.
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'La latitud debe ser un número con máximo 6 decimales.' })
  @Min(LIMITES_ANTIOQUIA.latMin, { message: `La latitud debe estar entre ${LIMITES_ANTIOQUIA.latMin} y ${LIMITES_ANTIOQUIA.latMax} (Antioquia).` })
  @Max(LIMITES_ANTIOQUIA.latMax, { message: `La latitud debe estar entre ${LIMITES_ANTIOQUIA.latMin} y ${LIMITES_ANTIOQUIA.latMax} (Antioquia).` })
  latitud?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'La longitud debe ser un número con máximo 6 decimales.' })
  @Min(LIMITES_ANTIOQUIA.lonMin, { message: `La longitud debe estar entre ${LIMITES_ANTIOQUIA.lonMin} y ${LIMITES_ANTIOQUIA.lonMax} (Antioquia).` })
  @Max(LIMITES_ANTIOQUIA.lonMax, { message: `La longitud debe estar entre ${LIMITES_ANTIOQUIA.lonMin} y ${LIMITES_ANTIOQUIA.lonMax} (Antioquia).` })
  longitud?: number;
}
